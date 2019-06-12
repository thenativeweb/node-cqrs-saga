var util = require('util'),
  Store = require('../base'),
  _ = require('lodash'),
  debug = require('debug')('saga:mongodb'),
  ConcurrencyError = require('../../errors/concurrencyError'),
  mongo = Store.use('mongodb'),
  mongoVersion = Store.use('mongodb/package.json').version,
  isNew = mongoVersion.indexOf('1.') !== 0,
  isNew = mongoVersion.indexOf('1.') !== 0,
  ObjectID = isNew ? mongo.ObjectID : mongo.BSONPure.ObjectID;

function Mongo(options) {
  Store.call(this, options);

  var defaults = {
    host: 'localhost',
    port: 27017,
    dbName: 'domain',
    collectionName: 'saga'//,
    // heartbeat: 60 * 1000
  };

  _.defaults(options, defaults);

  var defaultOpt = {
    ssl: false
  };

  options.options = options.options || {};

  if (isNew) {
    defaultOpt.autoReconnect = false;
    defaultOpt.useNewUrlParser = true;
    _.defaults(options.options, defaultOpt);
  } else {
    defaultOpt.auto_reconnect = false;
    _.defaults(options.options, defaultOpt);
  }

  this.options = options;
}

util.inherits(Mongo, Store);

_.extend(Mongo.prototype, {

  connect: function (callback) {
    var self = this;

    var options = this.options;

    var connectionUrl;

    if (options.url) {
      connectionUrl = options.url;
    } else {
      var members = options.servers
        ? options.servers
        : [{host: options.host, port: options.port}];

      var memberString = _(members).map(function(m) { return m.host + ':' + m.port; });
      var authString = options.username && options.password
        ? options.username + ':' + options.password + '@'
        : '';
      var optionsString = options.authSource
        ? '?authSource=' + options.authSource
        : '';

      connectionUrl = 'mongodb://' + authString + memberString + '/' + options.dbName + optionsString;
    }

    var client;

    if (mongo.MongoClient.length === 2) {
      client = new mongo.MongoClient(connectionUrl, options.options);
      client.connect(function(err, cl) {
        if (err) {
          debug(err);
          if (callback) callback(err);
          return;
        }

        self.db = cl.db(cl.s.options.dbName);
        if (!self.db.close) {
          self.db.close = cl.close.bind(cl);
        }
        initDb();
      });
    } else {
      client = new mongo.MongoClient();
      client.connect(connectionUrl, options.options, function(err, db) {
        if (err) {
          debug(err);
          if (callback) callback(err);
          return;
        }

        self.db = db;
        initDb();
      });
    }

    function initDb() {
      self.db.on('close', function() {
        self.emit('disconnect');
        self.stopHeartbeat();
      });

      var finish = function (err) {
        self.store = self.db.collection(options.collectionName);
        self.store.createIndex({ '_commands.id': 1}, function() {});
        self.store.createIndex({ '_timeoutAt': 1}, function() {});
        self.store.createIndex({ '_commitStamp': 1}, function() {});

        if (!err) {
          self.emit('connect');

          if (self.options.heartbeat) {
            self.startHeartbeat();
          }
        }
        if (callback) callback(err, self);
      };

      finish();
    }
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
          console.error((new Error ('Heartbeat timeouted after ' + gracePeriod + 'ms (mongodb)')).stack);
          self.disconnect();
        }
      }, gracePeriod);

      self.db.command({ ping: 1 }, function (err) {
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

    if (!this.db) {
      if (callback) callback(null);
      return;
    }

    this.db.close(callback || function () {});
  },

  getNewId: function(callback) {
    callback(null, new ObjectID().toString());
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

    saga._id = saga.id;
    saga._commands = cmds;

    if (!saga._hash) {
      saga._hash = new ObjectID().toString();
      this.store.insertOne(saga, { safe: true, w: 1 }, function (err) {
        if (err && err.message && err.message.indexOf('duplicate key') >= 0) {
          return callback(new ConcurrencyError());
        }
        if (callback) { callback(err); }
      });
    } else {
      var currentHash = saga._hash;
      saga._hash = new ObjectID().toString();
      this.store.updateOne({ _id: saga._id, _hash: currentHash }, { $set: saga }, { safe: true }, function(err, modifiedCount) {
        if (isNew) {
          if (modifiedCount && modifiedCount.result && modifiedCount.result.n === 0) {
            return callback(new ConcurrencyError());
          }
        } else {
          if (modifiedCount === 0) {
            return callback(new ConcurrencyError());
          }
        }
        if (callback) { callback(err); }
      });
    }
  },

  get: function (id, callback) {
    if (!id || !_.isString(id)) {
      var err = new Error('Please pass a valid id!');
      debug(err);
      return callback(err);
    }

    this.store.findOne({ _id: id }, function (err, saga) {
      if (err) {
        return callback(err);
      }

      if (!saga) {
        return callback(null, null);
      }

      if (saga._commands) {
        delete saga._commands;
      }

      callback(null, saga);
    });
  },

  remove: function (id, callback) {
    if (!id || !_.isString(id)) {
      var err = new Error('Please pass a valid id!');
      debug(err);
      return callback(err);
    }

    this.store.deleteOne({ _id: id }, { safe: true, w: 1 }, function (err) {
      if (callback) callback(err);
    });
  },

  getTimeoutedSagas: function (options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }
    options = options || {};
    // options.limit = options.limit || -1;
    // options.skip = options.skip || 0;
    options.sort = [['_timeoutAt', 'asc']];
    this.store.find({
      _timeoutAt: { '$lte': new Date() }
    }, options).toArray(function (err, sagas) {
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

  getUndispatchedCommands: function (options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }
    options = options || {};
    // options.limit = options.limit || -1;
    // options.skip = options.skip || 0;
    options.sort = [['_commitStamp', 'asc']];

    var res = [];

    this.store.find({
      '_commands.0': {$exists: true}
    }, options).toArray(function (err, sagas) {
      if (err) {
        return callback(err);
      }

      sagas.forEach(function (s) {
        if (s._commands && s._commands.length > 0) {
          s._commands.forEach(function (c) {
            res.push({ sagaId: s._id, commandId: c.id, command: c.payload, commitStamp: s._commitStamp });
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

    this.store.updateOne({ _id: sagaId, '_commands.id': cmdId }, { $pull: { '_commands': { id: cmdId } } }, { safe: true }, function (err) {
      if (callback) callback(err);
    });
  },

  clear: function (callback) {
    this.store.deleteMany({}, { safe: true }, callback);
  }

});

module.exports = Mongo;
