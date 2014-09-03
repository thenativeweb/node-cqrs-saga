'use strict';

var util = require('util'),
  Lock = require('../base'),
  _ = require('lodash');

function InMemory(options) {
  Lock.call(this, options);
  this.store = {};
}

util.inherits(InMemory, Lock);

_.extend(InMemory.prototype, {

  connect: function (callback) {
    this.emit('connect');
    if (callback) callback(null, this);
  },

  disconnect: function (callback) {
    this.emit('disconnect');
    if (callback) callback(null);
  },
  
  
  
  

  clear: function (callback) {
    this.store = {};
    if (callback) callback(null);
  }

});

module.exports = InMemory;
