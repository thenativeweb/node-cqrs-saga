'use strict';

var util = require('util'),
    Store = require('../base'),
    _ = require('lodash'),
    debug = require('debug')('saga:revisionGuardStore:mongodb'),
    ConcurrencyError = require('../../errors/concurrencyError'),
    mongo = Store.use('mongodb'),
    mongoVersion = Store.use('mongodb/package.json').version,
    isNew = mongoVersion.indexOf('1.') !== 0,
    ObjectID = isNew ? mongo.ObjectID : mongo.BSONPure.ObjectID;

function Mongo(options) {
  Store.call(this, options);

  var defaults = {
    host: 'localhost',
    port: 27017,
    dbName: 'readmodel',
    collectionName: 'revision'//,
    // heartbeat: 60 * 1000
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

      server = new mongo.ReplSet(servers);
    } else {
      server = new mongo.Server(options.host, options.port, options.options);
    }

    this.db = new mongo.Db(options.dbName, server, { safe: true });
    this.db.on('close', function() {
      self.emit('disconnect');
      self.stopHeartbeat();
    });

    this.db.open(function (err, client) {
      if (err) {
        if (callback) callback(err);
      } else {
        var finish = function (err) {
          self.client = client;
          self.store = self.db.collection(options.collectionName);
//          self.store.ensureIndex({ 'aggregateId': 1, date: 1 }, function() {});
          if (!err) {
            self.emit('connect');

            if (self.options.heartbeat) {
              self.startHeartbeat();
            }
          }
          if (callback) callback(err, self);
        };

        if (options.authSource && options.username) {
          // Authenticate with authSource
          client.authenticate(options.username, options.password, {authSource: options.authSource}, finish);
        } else if (options.username) {
          client.authenticate(options.username, options.password, finish);
        } else {
          finish();
        }
      }
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
          console.error((new Error ('Heartbeat timeouted after ' + gracePeriod + 'ms')).stack);
          self.db.close(function () {});
        }
      }, gracePeriod);

      self.db.command({ ping: 1 }, function (err) {
        if (graceTimer) clearTimeout(graceTimer);
        if (err) {
          console.error(err.stack || err);
          self.db.close(function () {});
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

  get: function (id, callback) {
    if (!id || !_.isString(id)) {
      var err = new Error('Please pass a valid id!');
      debug(err);
      return callback(err);
    }

    this.store.findOne({ _id: id }, function (err, entry) {
      if (err) {
        return callback(err);
      }

      if (!entry) {
        return callback(null, null);
      }

      callback(null, entry.revision || null);
    });
  },

  set: function (id, revision, oldRevision, callback) {
    if (!id || !_.isString(id)) {
      var err = new Error('Please pass a valid id!');
      debug(err);
      return callback(err);
    }
    if (!revision || !_.isNumber(revision)) {
      var err = new Error('Please pass a valid revision!');
      debug(err);
      return callback(err);
    }

    this.store.update({ _id: id, revision: oldRevision }, { _id: id, revision: revision }, { safe: true, upsert: true }, function (err, modifiedCount) {
      if (isNew) {
        if (modifiedCount && modifiedCount.result && modifiedCount.result.n === 0) {
          err = new ConcurrencyError();
          debug(err);
          if (callback) {
            callback(err);
          }
          return;
        }
      } else {
        if (modifiedCount === 0) {
          err = new ConcurrencyError();
          debug(err);
          if (callback) {
            callback(err);
          }
          return;
        }
      }
      if (err && err.message && err.message.match(/duplicate key/i)) {
        debug(err);
        err = new ConcurrencyError();
        debug(err);
        if (callback) {
          callback(err);
        }
        return;
      }
      if (callback) { callback(err); }
    });
  },

  saveLastEvent: function (evt, callback) {
    this.store.save({ _id: 'THE_LAST_SEEN_EVENT', event: evt }, { safe: true }, function (err) {
      if (callback) { callback(err); }
    });
  },

  getLastEvent: function (callback) {
    this.store.findOne({ _id: 'THE_LAST_SEEN_EVENT' }, function (err, entry) {
      if (err) {
        return callback(err);
      }

      if (!entry) {
        return callback(null, null);
      }

      callback(null, entry.event || null);
    });
  },

  clear: function (callback) {
    this.store.remove({}, { safe: true }, callback);
  }

});

module.exports = Mongo;
