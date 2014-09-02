'use strict';

var debug = require('debug')('saga:sagaModel'),
  dotty = require('dotty'),
  _ = require('lodash'),
  jsondate = require('jsondate');

/**
 * SagaModel constructor
 * @param {String} id The saga id.
 * @constructor
 */
function SagaModel (id) {
  if (!id || !_.isString(id)) {
    var err = new Error('No id injected!');
    debug(err);
    throw err;
  }

  this.id = id;

  this.attributes = {
    id: this.id
  };
  
  this.destroyed = false;

  this.commandsToSend = [];
}

SagaModel.prototype = {

  defineTimeout: function (date, cmds) {
    
    
    
    this.set('_timeoutAt', date);
    this.set('_timeoutCommands', cmds);
  },

  getTimeoutAt: function () {
    return this.get('_timeoutAt');
  },
  
  getTimeoutCommands: function () {
    return this.get('_timeoutCommands');
  },

  addUnsentCommand: function (cmd) {
    this.commandsToSend.push(cmd);
  },
  
  getUnsentCommands: function () {
    return this.commandsToSend;
  },

  addCommandToSend: function () {
    throw new Error('Attach addCommandToSend function!!!');
  },
  
  commit: function () {
    throw new Error('Attach commit function!!!');
  },

  /**
   * Marks this saga as destroyed.
   */
  destroy: function () {
    this.destroyed = true;
  },

  /**
   * Returns true if this saga is destroyed.
   * @returns {boolean}
   */
  isDestroyed: function () {
    return this.destroyed;
  },

  /**
   * The toJSON function will be called when JSON.stringify().
   * @return {Object} A clean Javascript object containing all attributes.
   */
  toJSON: function () {
    return jsondate.parse(JSON.stringify(this.attributes));
  },

  /**
   * Sets attributes for the saga.
   *
   * @example:
   *     saga.set('firstname', 'Jack');
   *     // or
   *     saga.set({
   *          firstname: 'Jack',
   *          lastname: 'X-Man'
   *     });
   */
  set: function (data) {
    if (arguments.length === 2) {
      dotty.put(this.attributes, arguments[0], arguments[1]);
    } else if (_.isObject(data)) {
      for (var m in data) {
        dotty.put(this.attributes, m, data[m]);
      }
    }
  },

  /**
   * Gets an attribute of the vm.
   * @param  {String} attr The attribute name.
   * @return {Object}      The result value.
   *
   * @example:
   *     saga.get('firstname'); // returns 'Jack'
   */
  get: function (attr) {
    return dotty.get(this.attributes, attr);
  },

  /**
   * Returns `true` if the attribute contains a value that is not null
   * or undefined.
   * @param  {String} attr The attribute name.
   * @return {Boolean}     The result value.
   *
   * @example:
   *     saga.has('firstname'); // returns true or false
   */
  has: function (attr) {
    return (this.get(attr) !== null && this.get(attr) !== undefined);
  }

};

module.exports = SagaModel;
