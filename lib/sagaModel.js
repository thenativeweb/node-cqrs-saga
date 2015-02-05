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

  this.attributes = {};

  this.id = id;

  this.destroyed = false;

  this.commandsToSend = [];

  this.actionOnCommit = 'create';
}

SagaModel.prototype = {

  /**
   * Gets the id of this saga.
   * @returns {String}
   */
  get id (){
    return this.attributes.id;
  },

  /**
   * Sets the id for this saga.
   * @param {String} val The saga id
   */
  set id (val){
    this.attributes.id = val;
  },

  /**
   * Defines the commit date.
   * @param {Date} date The commit date.
   */
  setCommitStamp: function (date) {
    this.set('_commitStamp', date);
  },

  /**
   * Returns the commit date.
   * @returns {Date}
   */
  getCommitStamp: function () {
    return this.get('_commitStamp');
  },

  /**
   * Defines a timeout date and optional timeout commands, and adds them to this model.
   * Will be called by the attached function 'defineTimeout'.
   * @param {Date}  date The timeout date.
   * @param {Array} cmds The array of commands.
   */
  addTimeout: function (date, cmds) {
    this.set('_timeoutAt', date);
    this.set('_timeoutCommands', cmds);
  },

  /**
   * Returns the timeout date.
   * @returns {Date}
   */
  getTimeoutAt: function () {
    return this.get('_timeoutAt');
  },

  /**
   * Returns the commands that should be handled when timeouted.
   * @returns {Array}
   */
  getTimeoutCommands: function () {
    return this.get('_timeoutCommands');
  },

  /**
   * Removes the timoutAt and the timeoutCommands values.
   */
  removeTimeout: function () {
    this.set('_timeoutAt', undefined);
    this.set('_timeoutCommands', undefined);
  },

  /**
   * Adds the passed command to this model.
   * Will be called by the attached function 'addCommandToSend'.
   * @param {Object} cmd The command that should be sent.
   */
  addUnsentCommand: function (cmd) {
    this.commandsToSend.push(cmd);
  },

  /**
   * Removes the passed command from this model.
   * @param {Object} cmd The command that should not be sent anymore.
   */
  removeUnsentCommand: function (cmd) {
    this.commandsToSend.splice(this.commandsToSend.indexOf(cmd), 1);
  },

  /**
   * Returns the commands that should be sent.
   * @returns {Array}
   */
  getUndispatchedCommands: function () {
    return [].concat(this.commandsToSend);
  },

  /**
   * Defines a timeout date and optional timeout commands, and adds them to this model.
   * Will be attached by saga handle.
   * @param {Date}  date The timeout date.
   * @param {Array} cmds The array of commands.
   */
  defineTimeout: function (date, cmds) {
    throw new Error('Attach defineTimeout function!!!');
  },

  /**
   * Adds the passed command to this model.
   * Will be attached by saga handle.
   * @param {Object} cmd The command that should be sent.
   */
  addCommandToSend: function (cmd) {
    throw new Error('Attach addCommandToSend function!!!');
  },

  /**
   * Commits the saga data and its commands.
   * Will be attached by saga handle.
   * @param {Function} callback The function, that will be called when this action is completed.
   *                            `function(err){}`
   */
  commit: function (callback) {
    throw new Error('Attach commit function!!!');
  },

  /**
   * Marks this saga as destroyed.
   */
  destroy: function () {
    this.destroyed = true;
    this.actionOnCommit = 'delete';
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
