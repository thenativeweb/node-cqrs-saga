'use strict';

var util = require('util'),
  EventEmitter = require('events').EventEmitter,
  prequire = require('parent-require'),
  _ = require('lodash'),
  uuid = require('uuid').v4;

/**
 * Guard constructor
 * @param {Object} options The options can have information like host, port, etc. [optional]
 */
function Guard(options) {
  options = options || {};

  EventEmitter.call(this);
}

util.inherits(Guard, EventEmitter);

function implementError (callback) {
  var err = new Error('Please implement this function!');
  if (callback) callback(err);
  throw err;
}

_.extend(Guard.prototype, {

  /**
   * Initiate communication with the lock.
   * @param  {Function} callback The function, that will be called when this action is completed. [optional]
   *                             `function(err, queue){}`
   */
  connect: implementError,

  /**
   * Terminate communication with the lock.
   * @param  {Function} callback The function, that will be called when this action is completed. [optional]
   *                             `function(err){}`
   */
  disconnect: implementError,

  /**
   * Use this function to obtain a new id.
   * @param  {Function} callback The function, that will be called when this action is completed.
   *                             `function(err, id){}` id is of type String.
   */
  getNewId: function (callback) {
    var id = uuid().toString();
    if (callback) callback(null, id);
  },

  /**
   * Use this function to obtain the revision by id.
   * @param {String}   id       The aggregate id.
   * @param {Function} callback The function, that will be called when this action is completed.
   *                             `function(err, revision){}` id is of type String.
   */
  get: function (id, callback) {
    implementError(callback);
  },

  /**
   * Updates the revision number.
   * @param {String}   id          The aggregate id.
   * @param {Number}   revision    The new revision number.
   * @param {Number}   oldRevision The old revision number.
   * @param {Function} callback    The function, that will be called when this action is completed.
   *                               `function(err, revision){}` id is of type String.
   */
  set: function (id, revision, oldRevision, callback) {
    implementError(callback);
  },

  /**
   * Saves the last event.
   * @param {Object}   evt      The event that should be saved.
   * @param {Function} callback The function, that will be called when this action is completed.
   *                            `function(err){}`
   */
  saveLastEvent: function (evt, callback) {
    implementError(callback);
  },

  /**
   * Gets the last event.
   * @param {Function} callback The function, that will be called when this action is completed.
   *                            `function(err, evt){}` evt is of type Object.
   */
  getLastEvent: function (callback) {
    implementError(callback);
  },

  /**
   * NEVER USE THIS FUNCTION!!! ONLY FOR TESTS!
   * clears the complete store...
   * @param {Function} callback the function that will be called when this action has finished [optional]
   */
  clear: function (callback) {
    implementError(callback);
  }

});

Guard.use = function (toRequire) {
  var required;
  try {
    required = require(toRequire);
  } catch (e) {
    // workaround when `npm link`'ed for development
    required = prequire(toRequire);
  }
  return required;
};

module.exports = Guard;
