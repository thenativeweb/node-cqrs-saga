'use strict';

var util = require('util'),
  EventEmitter = require('events').EventEmitter,
  prequire = require('parent-require'),
  _ = require('lodash'),
  uuid = require('uuid').v4;

/**
 * Store constructor
 * @param {Object} options The options can have information like host, port, etc. [optional]
 */
function Store(options) {
  options = options || {};

  EventEmitter.call(this);
}

util.inherits(Store, EventEmitter);

function implementError (callback) {
  var err = new Error('Please implement this function!');
  if (callback) callback(err);
  throw err;
}

_.extend(Store.prototype, {

  /**
   * Initiate communication with the lock.
   * @param {Function} callback The function, that will be called when this action is completed. [optional]
   *                             `function(err, queue){}`
   */
  connect: implementError,

  /**
   * Terminate communication with the lock.
   * @param {Function} callback The function, that will be called when this action is completed. [optional]
   *                             `function(err){}`
   */
  disconnect: implementError,

  /**
   * Use this function to obtain a new id.
   * @param {Function} callback The function, that will be called when this action is completed.
   *                             `function(err, id){}` id is of type String.
   */
  getNewId: function (callback) {
    var id = uuid().toString();
    if (callback) callback(null, id);
  },

  /**
   * Use this function to obtain the requested saga data.
   * @param {Function} callback The function, that will be called when this action is completed.
   *                             `function(err, data){}` data is of type Object.
   */
  get: function (id, callback) {
    implementError(callback);
  },

  /**
   * Use this function to remove the matched saga.
   * @param {String}   id       The id of the saga
   * @param {Function} callback The function, that will be called when this action is completed. [optional]
   *                             `function(err){}`
   */
  remove: function (id, callback) {
    implementError(callback);
  },

  /**
   * Use this function to save the saga and the optional commands.
   * @param {Object}   saga     The saga object
   * @param {Array}    cmds     The commands array (can be empty)
   * @param {Function} callback The function, that will be called when this action is completed. [optional]
   *                            `function(err){}`
   */
  save: function (saga, cmds, callback) {
    implementError(callback);
  },

  /**
   * Use this function to get all timeouted sagas.
   * @param  {Function} callback The function, that will be called when this action is completed.
   *                             `function(err, sagas){}` saga is of type Array.
   */
  getTimeoutedSagas: function (options, callback) {
    implementError(callback || options);
  },

  /**
   * Use this function to get all sagas that are older then the passed date.
   * @param {Date}     date     The date
   * @param {Function} callback The function, that will be called when this action is completed.
   *                            `function(err, sagas){}` saga is of type Array.
   */
  getOlderSagas: function (date, callback) {
    implementError(callback);
  },

  /**
   * Use this function to get all undispatched commands.
   * @param {Function} callback The function, that will be called when this action is completed.
   *                            `function(err, cmdsSagaMap){}` cmdsSagaMap is of type Array.
   */
  getUndispatchedCommands: function (options, callback) {
    implementError(callback || options);
  },

  /**
   * Use this function mark a command as dispatched. (will remove it from the db)
   * @param {String}   cmdId    The command id
   * @param {String}   sagaId   The saga id
   * @param {Function} callback The function, that will be called when this action is completed. [optional]
   *                            `function(err){}`
   */
  setCommandToDispatched: function (cmdId, sagaId, callback) {
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

Store.use = function (toRequire) {
  var required;
  try {
    required = require(toRequire);
  } catch (e) {
    // workaround when `npm link`'ed for development
    required = prequire(toRequire);
  }
  return required;
};

module.exports = Store;
