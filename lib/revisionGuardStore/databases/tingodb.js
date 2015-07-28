'use strict';

var util = require('util'),
    Store = require('../base'),
    _ = require('lodash'),
    debug = require('debug')('saga:revisionGuardStore:tingodb'),
    ConcurrencyError = require('../../errors/concurrencyError'),
    tingodb = Store.use('tingodb')(),
    ObjectID = tingodb.ObjectID;

function Tingo(options) {
  Store.call(this, options);

  var defaults = {
    dbPath: require('path').join(__dirname, '/../../../'),
    collectionName: 'revision'
  };

  _.defaults(options, defaults);

  this.options = options;
}

util.inherits(Tingo, Store);

_.extend(Tingo.prototype, {

  connect: function (callback) {
    var self = this;

    var options = this.options;

    this.db = new tingodb.Db(options.dbPath, {});
    // this.db.on('close', function() {
    //   self.emit('disconnect');
    // });
    this.store = this.db.collection(options.collectionName + '.tingo');
//    this.store.ensureIndex({ 'aggregateId': 1, date: 1 }, function() {});

    this.emit('connect');
    if (callback) callback(null, this);
  },

  disconnect: function (callback) {
    if (!this.db) {
      if (callback) callback(null);
      return;
    }

    this.emit('disconnect');
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
      if (modifiedCount === 0) {
        err = new ConcurrencyError();
        debug(err);
        if (callback) {
          callback(err);
        }
        return;
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

module.exports = Tingo;
