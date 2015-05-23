'use strict';

var util = require('util'),
    Store = require('../base'),
    debug = require('debug')('saga:revisionGuardStore:inmemory'),
    ConcurrencyError = require('../../errors/concurrencyError'),
    _ = require('lodash');

function InMemory(options) {
  Store.call(this, options);
  this.store = {};
  this.lastEvent = null;
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

    if (this.store[id] && this.store[id] !== oldRevision) {
      return callback(new ConcurrencyError());
    }

    this.store[id] = revision;

    callback(null);
  },

  saveLastEvent: function (evt, callback) {
    this.lastEvent = evt;
    if (callback) callback(null);
  },

  getLastEvent: function (callback) {
    callback(null, this.lastEvent);
  },

  clear: function (callback) {
    this.store = {};
    this.lastEvent = null;
    if (callback) callback(null);
  }

});

module.exports = InMemory;
