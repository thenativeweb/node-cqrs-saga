'use strict';

var util = require('util'),
  Store = require('../base'),
  _ = require('lodash'),
  debug = require('debug')('saga:mongodb'),
  ConcurrencyError = require('../../concurrencyError'),
  jsondate = require('jsondate'),
  async = require('async'),
  redis = require('redis');

function Redis(options) {
  Store.call(this, options);

  var defaults = {
    host: 'localhost',
    port: 6379,
    prefix: 'saga',
    max_attempts: 1
  };

  _.defaults(options, defaults);

  if (options.url) {
    var url = require('url').parse(options.url);
    if (url.protocol === 'redis:') {
      if (url.auth) {
        var userparts = url.auth.split(":");
        options.user = userparts[0];
        if (userparts.length === 2) {
          options.password = userparts[1];
        }
      }
      options.host = url.hostname;
      options.port = url.port;
      if (url.pathname) {
        options.db   = url.pathname.replace("/", "", 1);
      }
    }
  }

  this.options = options;
}

util.inherits(Redis, Store);

_.extend(Redis.prototype, {

  connect: function (callback) {
    var self = this;

    var options = this.options;

    this.client = new redis.createClient(options.port || options.socket, options.host, options);

    this.prefix = options.prefix;

    var calledBack = false;

    if (options.password) {
      this.client.auth(options.password, function(err) {
        if (err && !calledBack && callback) {
          calledBack = true;
          if (callback) callback(err, self);
          return;
        }
        if (err) throw err;
      });
    }

    if (options.db) {
      this.client.select(options.db);
    }

    this.client.on('end', function () {
      self.disconnect();
    });

    this.client.on('error', function (err) {
      console.log(err);

      if (calledBack) return;
      calledBack = true;
      if (callback) callback(null, self);
    });

    this.client.on('connect', function () {
      if (options.db) {
        self.client.send_anyways = true;
        self.client.select(options.db);
        self.client.send_anyways = false;
      }

      self.emit('connect');

      if (calledBack) return;
      calledBack = true;
      if (callback) callback(null, self);
    });
  },

  disconnect: function (callback) {
    if (this.client) {
      this.client.end();
    }
    this.emit('disconnect');
    if (callback) callback(null, this);
  },

  getNewId: function(callback) {
    this.client.incr('nextItemId:' + this.prefix, function(err, id) {
      if (err) {
        return callback(err);
      }
      callback(null, id.toString());
    });
  },

  save: function (saga, cmds, callback) {
    if (!saga || !_.isObject(saga) || !_.isString(saga.id) || !_.isDate(saga._commitStamp)) {
      var err = new Error('Please pass a valid saga!');
      debug(err);
      return callback(err);
    }

    if (!cmds || !_.isArray(cmds)) {
      var err = new Error('Please pass a valid saga!');
      debug(err);
      return callback(err);
    }

    if (cmds.length > 0) {
      for (var c in cmds) {
        var cmd = cmds[c];
        if (!cmd.id || !_.isString(cmd.id)) {
          var err = new Error('Please pass a valid commands array!');
          debug(err);
          return callback(err);
        }
      }
    }

    var self = this;

    var sagaKey;
    if (saga._timeoutAt) {
      sagaKey = this.options.prefix + '_saga' + ':' +  saga._commitStamp.getTime() + ':' + saga._timeoutAt.getTime() + ':' + saga.id;
    } else {
      sagaKey = this.options.prefix + '_saga' + ':' +  saga._commitStamp.getTime() + ':' + Infinity + ':' + saga.id;
    }
    
    var cmdMap = [];

    _.each(cmds, function (cmd) {
      cmdMap.push(self.options.prefix + '_command' + ':' + saga.id+ ':' + cmd.id);
      cmdMap.push(JSON.stringify(cmd));
    });

    var args = [sagaKey, saga].concat(cmdMap);

    this.client.mset.apply(this.client, args);
  },

  get: function (id, callback) {
    if (!id || !_.isString(id)) {
      var err = new Error('Please pass a valid id!');
      debug(err);
      return callback(err);
    }
    
    var self = this;

    this.client.keys(this.options.prefix + '_saga:*:*:' + id, function (err, keys) {
      if (err) {
        debug(err);
        if (callback) callback(err);
        return;
      }

      if (keys.length === 0) {
        if (callback) callback(null, null);
        return;
      }

      self.client.get(keys[0], function (err, saga) {
        if (err) {
          return callback(err);
        }

        if (!saga) {
          return callback(null, null);
        }

        try {
          saga = jsondate.parse(saga.toString());
        } catch (error) {
          if (callback) callback(err);
          return;
        }

        callback(null, saga);
      });
    });
  },

  remove: function (id, callback) {
    if (!id || !_.isString(id)) {
      var err = new Error('Please pass a valid id!');
      debug(err);
      return callback(err);
    }

    this.store.remove({ _id: id }, { safe: true }, function (err) {
      if (callback) callback(err);
    });
  },

  getTimeoutedSagas: function (callback) {
    this.store.find({
      _timeoutAt: { '$lte': new Date() }
    }).toArray(function (err, sagas) {
      if (err) {
        return callback(err);
      }

      sagas.forEach(function (s) {
        if (s._commands) {
          delete s._commands;
        }
      });

      callback(null, sagas);
    });
  },

  getOlderSagas: function (date, callback) {
    if (!date || !_.isDate(date)) {
      var err = new Error('Please pass a valid date object!');
      debug(err);
      return callback(err);
    }

    this.store.find({
      _commitStamp: { '$lte': date }
    }).toArray(function (err, sagas) {
      if (err) {
        return callback(err);
      }

      sagas.forEach(function (s) {
        if (s._commands) {
          delete s._commands;
        }
      });

      callback(null, sagas);
    });
  },

  getUndispatchedCommands: function (callback) {
    var res = [];

    this.store.find({
      '_commands.0': {$exists: true}
    }).toArray(function (err, sagas) {
      if (err) {
        return callback(err);
      }

      sagas.forEach(function (s) {
        if (s._commands && s._commands.length > 0) {
          s._commands.forEach(function (c) {
            res.push({ sagaId: s._id, command: c });
          });
        }
      });

      callback(null, res);
    });
  },

  setCommandToDispatched: function (cmdId, sagaId, callback) {
    if (!cmdId || !_.isString(cmdId)) {
      var err = new Error('Please pass a valid command id!');
      debug(err);
      return callback(err);
    }

    if (!sagaId || !_.isString(sagaId)) {
      var err = new Error('Please pass a valid saga id!');
      debug(err);
      return callback(err);
    }

    this.store.update({ _id: sagaId, '_commands.id': cmdId }, { $pull: { '_commands': { id: cmdId } } }, { safe: true }, function (err) {
      if (callback) callback(err);
    });
  },

  clear: function (callback) {
    var self = this;
    async.parallel([
      function (callback) {
        self.client.del('nextItemId:' + self.options.prefix, callback);
      },
      function (callback) {
        self.client.keys(self.options.prefix + ':*', function(err, keys) {
          if (err) {
            return callback(err);
          }
          async.each(keys, function (key, callback) {
            self.client.del(key, callback);
          }, callback);
        });
      }
    ], function (err) {
      if (err) {
        debug(err);
      }
      if (callback) callback(err);
    });
  }

});

module.exports = Redis;
