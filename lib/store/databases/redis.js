'use strict';

var util = require('util'),
  Store = require('../base'),
  _ = require('lodash'),
  debug = require('debug')('saga:redis'),
  uuid = require('uuid').v4,
  ConcurrencyError = require('../../errors/concurrencyError'),
  jsondate = require('jsondate'),
  async = require('async'),
  redis = Store.use('redis');

function Redis(options) {
  Store.call(this, options);

  var defaults = {
    host: 'localhost',
    port: 6379,
    prefix: 'saga',
    max_attempts: 1,
    retry_strategy: function (options) {
      return undefined;
    }//,
    // heartbeat: 60 * 1000
  };

  _.defaults(options, defaults);

  if (options.url) {
    var url = require('url').parse(options.url);
    if (url.protocol === 'redis:') {
      if (url.auth) {
        var userparts = url.auth.split(':');
        options.user = userparts[0];
        if (userparts.length === 2) {
          options.password = userparts[1];
        }
      }
      options.host = url.hostname;
      options.port = url.port;
      if (url.pathname) {
        options.db = url.pathname.replace('/', '', 1);
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

    this.client = new redis.createClient(options.port || options.socket, options.host, _.omit(options, 'prefix'));

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
      self.stopHeartbeat();
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

      if (self.options.heartbeat) {
        self.startHeartbeat();
      }

      if (calledBack) return;
      calledBack = true;
      if (callback) callback(null, self);
    });
  },

  stopHeartbeat: function () {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      delete this.heartbeatInterval;
    }
  },

  startHeartbeat: function () {
    var self = this;

    var gracePeriod = Math.round(this.options.heartbeat / 2);
    this.heartbeatInterval = setInterval(function () {
      var graceTimer = setTimeout(function () {
        if (self.heartbeatInterval) {
          console.error((new Error ('Heartbeat timeouted after ' + gracePeriod + 'ms (redis)')).stack);
          self.disconnect();
        }
      }, gracePeriod);

      self.client.ping(function (err) {
        if (graceTimer) clearTimeout(graceTimer);
        if (err) {
          console.error(err.stack || err);
          self.disconnect();
        }
      });
    }, this.options.heartbeat);
  },

  disconnect: function (callback) {
    this.stopHeartbeat();

    if (this.client) {
      this.client.end(true);
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
      cmd.payload._commitStamp = saga._commitStamp;
      cmdMap.push(self.options.prefix + '_command' + ':' + cmd.payload._sagaId+ ':' + cmd.payload._commandId);
      cmdMap.push(JSON.stringify(cmd.payload));
    });

    this.client.watch(sagaKey, function (err) {
      if (err) {
        return callback(err);
      }

      self.get(saga.id, function (err, s) {
        if (err) {
          debug(err);
          if (callback) callback(err);
          return;
        }

        if ((s && saga._hash && saga._hash !== s._hash) ||
          (!s && saga._hash) ||
          (s && s._hash && !saga._hash)) {
          self.client.unwatch(function (err) {
            if (err) {
              debug(err);
            }

            err = new ConcurrencyError();
            debug(err);
            if (callback) {
              callback(err);
            }
          });
          return;
        }

        saga._hash = uuid().toString();

        var args = [sagaKey, JSON.stringify(saga)].concat(cmdMap);

        self.client.multi([['mset'].concat(args)]).exec(function (err, replies) {
          if (err) {
            debug(err);
            if (callback) {
              callback(err);
            }
            return;
          }
          if (!replies || replies.length === 0 || _.find(replies, function (r) { return (r !== 'OK' && r !== 1); })) {
            var err = new ConcurrencyError();
            debug(err);
            if (callback) {
              callback(err);
            }
            return;
          }
          if (callback) {
            callback(null);
          }
        });
      });
    });
  },

  scan: function (key, cursor, handleKeys, callback) {
    var self = this;

    if (!callback) {
      callback = handleKeys;
      handleKeys = cursor;
      cursor = 0;
    }

    (function scanRecursive (curs) {
      self.client.scan(curs, 'match', key, function (err, res) {
        if (err) {
          return callback(err);
        }

        function next () {
          if (res[0] === '0') {
            callback(null);
          } else {
            scanRecursive(res[0]);
          }
        }

        if (res[1].length === 0) {
          return next();
        }

        handleKeys(res[1], function (err) {
          if (err) {
            return callback(err);
          }
          next();
        });
      });
    })(cursor);
  },

  get: function (id, callback) {
    if (!id || !_.isString(id)) {
      var err = new Error('Please pass a valid id!');
      debug(err);
      return callback(err);
    }

    var self = this;

    var allKeys = [];

    this.scan(this.options.prefix + '_saga:*:*:' + id,
      function (keys, fn) {
        allKeys = allKeys.concat(keys);
        fn();
      }, function (err) {
        if (err) {
          debug(err);
          if (callback) callback(err);
          return;
        }

        if (allKeys.length === 0) {
          if (callback) callback(null, null);
          return;
        }

        allKeys = _.sortBy(allKeys, function (s) {
          return s;
        });

        self.client.get(allKeys[0], function (err, saga) {
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
      }
    );
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
        self.scan(self.options.prefix + '_saga:*:*:' + id,
          function (keys, fn) {
            async.each(keys, function (key, callback) {
              self.client.del(key, callback);
            }, fn);
          }, callback
        );
      },

      function (callback) {
        self.scan(self.options.prefix + '_command:' + id + ':*',
          function (keys, fn) {
            async.each(keys, function (key, callback) {
              self.client.del(key, callback);
            }, fn);
          }, callback
        );
      }
    ], function (err) {
      if (err) {
        debug(err);
      }
      if (callback) callback(err);
    });
  },

  getTimeoutedSagas: function (options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }
    options = options || {};
    options.limit = options.limit || -1;
    options.skip = options.skip || 0;

    var res = [];
    var self = this;

    var allKeys = [];

    this.scan(this.options.prefix + '_saga:*:*:*',
      function (keys, fn) {
        allKeys = allKeys.concat(keys);
        fn();
      }, function (err) {
        if (err) {
          debug(err);
          if (callback) callback(err);
          return;
        }

        if (allKeys.length === 0) {
          return callback(null, res);
        }

        allKeys = _.sortBy(allKeys, function (s) {
          return s;
        });

        if (options.limit === -1) {
          allKeys = allKeys.slice(options.skip);
        }
        else {
          allKeys = allKeys.slice(options.skip, options.skip + options.limit);
        }

        if (allKeys.length === 0) {
          return callback(null, []);
        }

        async.each(allKeys, function (key, callback) {
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
      }
    );
  },

  getOlderSagas: function (date, callback) {
    if (!date || !_.isDate(date)) {
      var err = new Error('Please pass a valid date object!');
      debug(err);
      return callback(err);
    }

    var res = [];
    var self = this;

    var allKeys = [];

    this.scan(this.options.prefix + '_saga:*:*:*',
      function (keys, fn) {
        allKeys = allKeys.concat(keys);
        fn();
      }, function (err) {
        if (err) {
          debug(err);
          if (callback) callback(err);
          return;
        }

        if (allKeys.length === 0) {
          return callback(null, res);
        }

        allKeys = _.sortBy(allKeys, function (s) {
          return s;
        });

        async.each(allKeys, function (key, callback) {
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
      }
    );
  },

  getUndispatchedCommands: function (options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }
    options = options || {};
    options.limit = options.limit || -1;
    options.skip = options.skip || 0;

    var res = [];
    var self = this;

    var allKeys = [];

    this.scan(this.options.prefix + '_command:*:*',
      function (keys, fn) {
        allKeys = allKeys.concat(keys);
        fn();
      }, function (err) {
        if (err) {
          debug(err);
          if (callback) callback(err);
          return;
        }

        allKeys = _.sortBy(allKeys, function (s) {
          return s;
        });

        if (options.limit === -1) {
          allKeys = allKeys.slice(options.skip);
        }
        else {
          allKeys = allKeys.slice(options.skip, options.skip + options.limit);
        }

        if (allKeys.length === 0) {
          return callback(null, []);
        }

        async.each(allKeys, function (key, callback) {
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

            res.push({ sagaId: data._sagaId, commandId: data._commandId, command: data, commitStamp: data._commitStamp });
            callback(null);
          });
        }, function (err) {
          if (err) {
            debug(err);
          }
          if (callback) callback(err, res);
        });
      }
    );
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
