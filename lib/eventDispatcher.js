'use strict';

var debug = require('debug')('saga:eventDispatcher'),
  _ = require('lodash'),
  dotty = require('dotty');

/**
 * EventDispatcher constructor
 * @param {Object} tree       The tree object.
 * @param {Object} definition The definition object.
 * @constructor
 */
function EventDispatcher (tree, definition) {
  if (!tree || !_.isObject(tree) || !_.isFunction(tree.getSagaPart)) {
    var err = new Error('Please pass a valid tree!');
    debug(err);
    throw err;
  }

  if (!definition || !_.isObject(definition)) {
    var err = new Error('Please pass a valid command definition!');
    debug(err);
    throw err;
  }

  this.tree = tree;
  this.definition = definition;
}

EventDispatcher.prototype = {

  /**
   * Returns the target information of this event.
   * @param {Object} evt The passed event.
   * @returns {{name: 'eventName', aggregateId: 'aggregateId', version: 0, aggregate: 'aggregateName', context: 'contextName'}}
   */
  getTargetInformation: function (evt) {
    if (!evt || !_.isObject(evt)) {
      var err = new Error('Please pass a valid event!');
      debug(err);
      throw err;
    }

    var aggregateId = null;
    if (dotty.exists(evt, this.definition.aggregateId)) {
      aggregateId = dotty.get(evt, this.definition.aggregateId);
    } else {
      debug('no aggregateId found');
    }

    var name = dotty.get(evt, this.definition.name);

    var version = 0;
    if (dotty.exists(evt, this.definition.version)) {
      version = dotty.get(evt, this.definition.version);
    } else {
      debug('no version found, handling as version: 0');
    }

    var aggregate = null;
    if (dotty.exists(evt, this.definition.aggregate)) {
      aggregate = dotty.get(evt, this.definition.aggregate);
    } else {
      debug('no aggregate found');
    }

    var context = null;
    if (dotty.exists(evt, this.definition.context)) {
      context = dotty.get(evt, this.definition.context);
    } else {
      debug('no aggregateName found');
    }

    return {
      name: name,
      aggregateId: aggregateId,
      version: version,
      aggregate: aggregate,
      context: context
    };
  },

  /**
   * Dispatches an event.
   * @param {Object}   evt      The passed event.
   * @param {Function} callback The function, that will be called when this action is completed.
   *                            `function(err, cmds){}`
   */
  dispatch: function (evt, callback) {
    if (!evt || !_.isObject(evt)) {
      var err = new Error('Please pass a valid event!');
      debug(err);
      throw err;
    }

    if (!callback || !_.isFunction(callback)) {
      var err = new Error('Please pass a valid callback!');
      debug(err);
      throw err;
    }

    var target = this.getTargetInformation(evt);

    var sagaPart = this.tree.getSagaPart(target);

    if (!sagaPart) {
      var err = new Error('No saga found for ' + target.name);
      debug(err);
      return callback(err);
    }

    sagaPart.handle(evt, callback);
  }

};

module.exports = EventDispatcher;
