'use strict';

var util = require('util'),
  Store = require('../base'),
  _ = require('lodash'),
  debug = require('debug')('saga:mongodb'),
  ConcurrencyError = require('../../concurrencyError'),
  mongo = require('mongodb'),
  ObjectID = mongo.BSONPure.ObjectID;

function Mongo(options) {
  Store.call(this, options);

  var defaults = {
    host: 'localhost',
    port: 27017,
    dbName: 'domain',
    collectionName: 'saga'
  };

  _.defaults(options, defaults);

  var defaultOpt = {
    auto_reconnect: false,
    ssl: false
  };

  options.options = options.options || {};

  _.defaults(options.options, defaultOpt);

  this.options = options;
}

util.inherits(Mongo, Store);

_.extend(Mongo.prototype, {

  connect: function (callback) {
    var self = this;

    var options = this.options;

    var server;

    if (options.servers && Array.isArray(options.servers)){
      var servers = [];

      options.servers.forEach(function(item){
        if(item.host && item.port) {
          servers.push(new mongo.Server(item.host, item.port, item.options));
        }
      });

      server = new mongo.ReplSetServers(servers);
    } else {
      server = new mongo.Server(options.host, options.port, options.options);
    }

    this.db = new mongo.Db(options.dbName, server, { safe: true });
    this.db.on('close', function() {
      self.emit('disconnect');
    });

    this.db.open(function (err, client) {
      if (err) {
        if (callback) callback(err);
      } else {
        var finish = function (err) {
          self.client = client;
          self.store = new mongo.Collection(client, options.collectionName);
          self.store.ensureIndex({ '_commands': 1, '_commands.id': 1, _timeoutAt: 1, _commitStamp: 1, _hash: 1 }, function() {});
          if (!err) {
            self.emit('connect');
          }
          if (callback) callback(err, self);
        };

        if (options.username) {
          client.authenticate(options.username, options.password, finish);
        } else {
          finish();
        }
      }
    });
  },

  disconnect: function (callback) {
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
      this.store.insert(saga, { safe: true }, function (err) {
        if (err && err.message && err.message.indexOf('duplicate key') >= 0) {
          return callback(new ConcurrencyError());
        }
        if (callback) { callback(err); }
      });
    } else {
      var currentHash = saga._hash;
      saga._hash = new ObjectID().toString();
      this.store.update({ _id: saga._id, _hash: currentHash }, saga, { safe: true }, function(err, modifiedCount) {
        if (modifiedCount === 0) {
          return callback(new ConcurrencyError());
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
            res.push({ sagaId: s._id, commandId: c.id, command: c.payload });
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
    this.store.remove({}, { safe: true }, callback);
  }

});

module.exports = Mongo;
