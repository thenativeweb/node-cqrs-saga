'use strict';

var util = require('util'),
  Store = require('../base'),
  _ = require('lodash'),
  debug = require('debug')('saga:redis'),
  uuid = require('node-uuid').v4,
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
        if (!cmd.id || !_.isString(cmd.id) || !cmd.payload) {
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
      sagaKey = this.options.prefix + '_saga' + ':' +  saga._commitStamp.getTime() + ':Infinity:' + saga.id;
    }
    
    var cmdMap = [];

    _.each(cmds, function (cmd) {
      cmd.payload._sagaId = saga.id;
      cmd.payload._commandId = cmd.id;
      cmdMap.push(self.options.prefix + '_command' + ':' + cmd.payload._sagaId+ ':' + cmd.payload._commandId);
      cmdMap.push(JSON.stringify(cmd.payload));
    });
    
    this.get(saga.id, function (err, s) {
      if (err) {
        debug(err);
        if (callback) callback(err);
        return;
      }

      if ((s && saga._hash && saga._hash !== s._hash) ||
        (!s && saga._hash) ||
        (s && s._hash && !saga._hash)) {
        var err = new ConcurrencyError();
        debug(err);
        if (callback) { callback(err); }
        return;
      }

      saga._hash = uuid().toString();

      var args = [sagaKey, JSON.stringify(saga)].concat(cmdMap).concat([function (err) {
        if (callback) {
          callback(err);
        }
      }]);

      self.client.mset.apply(self.client, args);
    });
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

      keys = _.sortBy(keys, function (s) {
        return s;
      });

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

    var self = this;
    
    async.parallel([
      function (callback) {
        self.client.keys(self.options.prefix + '_saga:*:*:' + id, function (err, keys) {
          if (err) {
            return callback(err);
          }

          async.each(keys, function (key, callback) {
            self.client.del(key, callback);
          }, callback);
        });
      },

      function (callback) {
        self.client.keys(self.options.prefix + '_command:' + id + ':*', function (err, keys) {
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
  },

  getTimeoutedSagas: function (callback) {
    var res = [];
    var self = this;
    
    this.client.keys(this.options.prefix + '_saga:*:*:*', function (err, keys) {
      if (err) {
        return callback(err);
      }

      if (keys.length === 0) {
        return callback(null, res);
      }

      keys = _.sortBy(keys, function (s) {
        return s;
      });
      
      async.each(keys, function (key, callback) {
        var parts = key.split(':');
        var prefix = parts[0];
        var commitStampMs = parts[1];
        var timeoutAtMs = parts[2];
        var sagaId = parts[3];

        if (commitStampMs === 'Infinity') {
          commitStampMs = Infinity;
        }
        if (_.isString(commitStampMs)) {
          commitStampMs = parseInt(commitStampMs, 10);
        }

        if (timeoutAtMs === 'Infinity') {
          timeoutAtMs = Infinity;
        }
        if (_.isString(timeoutAtMs)) {
          timeoutAtMs = parseInt(timeoutAtMs, 10);
        }
        
        if (timeoutAtMs > (new Date()).getTime()) {
          return callback(null);
        }
        
        self.get(sagaId, function (err, saga) {
          if (err) {
            return callback(err);
          }
          if (saga) {
            res.push(saga);
          }
          callback(null);
        });
        
      }, function (err) {
        if (err) {
          return callback(err);
        }
        callback(null, res);
      });
    });
  },

  getOlderSagas: function (date, callback) {
    if (!date || !_.isDate(date)) {
      var err = new Error('Please pass a valid date object!');
      debug(err);
      return callback(err);
    }

    var res = [];
    var self = this;

    this.client.keys(this.options.prefix + '_saga:*:*:*', function (err, keys) {
      if (err) {
        return callback(err);
      }

      if (keys.length === 0) {
        return callback(null, res);
      }

      keys = _.sortBy(keys, function (s) {
        return s;
      });

      async.each(keys, function (key, callback) {
        var parts = key.split(':');
        var prefix = parts[0];
        var commitStampMs = parts[1];
        var timeoutAtMs = parts[2];
        var sagaId = parts[3];

        if (commitStampMs === 'Infinity') {
          commitStampMs = Infinity;
        }
        if (_.isString(commitStampMs)) {
          commitStampMs = parseInt(commitStampMs, 10);
        }

        if (timeoutAtMs === 'Infinity') {
          timeoutAtMs = Infinity;
        }
        if (_.isString(timeoutAtMs)) {
          timeoutAtMs = parseInt(timeoutAtMs, 10);
        }

        if (commitStampMs > date.getTime()) {
          return callback(null);
        }

        self.get(sagaId, function (err, saga) {
          if (err) {
            return callback(err);
          }
          if (saga) {
            res.push(saga);
          }
          callback(null);
        });

      }, function (err) {
        if (err) {
          return callback(err);
        }
        callback(null, res);
      });
    });
  },

  getUndispatchedCommands: function (callback) {
    var res = [];
    var self = this;

    this.client.keys(this.options.prefix + '_command:*:*', function (err, keys) {
      if (err) {
        return callback(err);
      }

      keys = _.sortBy(keys, function (s) {
        return s;
      });

      async.each(keys, function (key, callback) {
        self.client.get(key, function (err, data) {
          if (err) {
            return callback(err);
          }

          if (!data) {
            return callback(null);
          }

          try {
            data = jsondate.parse(data.toString());
          } catch (error) {
            return callback(err);
          }
          
          res.push({ sagaId: data._sagaId, commandId: data._commandId, command: data });
          callback(null);
        });
      }, function (err) {
        if (err) {
          debug(err);
        }
        if (callback) callback(err, res);
      });
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

    this.client.del(this.options.prefix + '_command:' + sagaId + ':' + cmdId, function (err) {
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
        self.client.keys(self.options.prefix + '_saga:*', function(err, keys) {
          if (err) {
            return callback(err);
          }
          async.each(keys, function (key, callback) {
            self.client.del(key, callback);
          }, callback);
        });
      },
      function (callback) {
        self.client.keys(self.options.prefix + '_command:*', function(err, keys) {
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
