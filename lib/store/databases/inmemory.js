'use strict';

var util = require('util'),
  Store = require('../base'),
  debug = require('debug')('saga:inmemory'),
  uuid = require('uuid').v4,
  ConcurrencyError = require('../../errors/concurrencyError'),
  _ = require('lodash');

function InMemory(options) {
  Store.call(this, options);
  this.store = {};
  this.cmds = {};
}

util.inherits(InMemory, Store);

_.extend(InMemory.prototype, {

  connect: function (callback) {
    this.emit('connect');
    if (callback) callback(null, this);
  },

  disconnect: function (callback) {
    this.emit('disconnect');
    if (callback) callback(null);
  },

  get: function (id, callback) {
    if (!id || !_.isString(id)) {
      var err = new Error('Please pass a valid id!');
      debug(err);
      return callback(err);
    }

    callback(null, this.store[id] || null);
  },

  remove: function (id, callback) {
    if (!id || !_.isString(id)) {
      var err = new Error('Please pass a valid id!');
      debug(err);
      return callback(err);
    }

    if (this.store[id]) {
      delete this.store[id];
    }

    if (this.cmds[id]) {
      delete this.cmds[id];
    }

    if (callback) { callback(null); }
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

    if ((this.store[saga.id] && saga._hash && saga._hash !== this.store[saga.id]._hash) ||
        (!this.store[saga.id] && saga._hash) ||
        (this.store[saga.id] && this.store[saga.id]._hash && !saga._hash)) {
      var err = new ConcurrencyError();
      debug(err);
      if (callback) { callback(err); }
      return;
    }

    saga._hash = uuid().toString();

    this.store[saga.id] = saga;
    this.cmds[saga.id] = this.cmds[saga.id] || {};

    var self = this;
    cmds.forEach(function (cmd) {
      self.cmds[saga.id][cmd.id] = cmd.payload;
    });

    if (callback) { callback(null); }
  },

  getTimeoutedSagas: function (options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }
    options = options || {};

    options.limit = options.limit || -1;
    options.skip = options.skip || 0;

    var res = _.filter(_.values(this.store), function (s) {
      return s._timeoutAt && s._timeoutAt.getTime() <= (new Date()).getTime();
    });

    if (options.limit === -1) {
      return callback(null, res.slice(options.skip));
    }

    if (res.length <= options.skip) {
      return callback(null, []);
    }

    callback(null, res.slice(options.skip, options.skip + options.limit));
  },

  getOlderSagas: function (date, callback) {
    if (!date || !_.isDate(date)) {
      var err = new Error('Please pass a valid date object!');
      debug(err);
      return callback(err);
    }

    var res = _.filter(_.values(this.store), function (s) {
      return s._commitStamp.getTime() <= (date).getTime();
    });

    callback(null, res);
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
    for (var sagaId in this.cmds) {
      for (var cmdId in this.cmds[sagaId]) {
        res.push({ sagaId: sagaId, commandId: cmdId, command: this.cmds[sagaId][cmdId], commitStamp: this.store[sagaId]._commitStamp });
      }
    }

    if (options.limit === -1) {
      return callback(null, res.slice(options.skip));
    }

    if (res.length <= options.skip) {
      return callback(null, []);
    }

    callback(null, res.slice(options.skip, options.skip + options.limit));
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

    if (!this.cmds[sagaId] || !this.cmds[sagaId][cmdId]) {
      if (callback) { callback(null); }
      return;
    }

    delete this.cmds[sagaId][cmdId];

    callback(null);
  },

  clear: function (callback) {
    this.store = {};
    this.cmds = {};
    if (callback) callback(null);
  }

});

module.exports = InMemory;
