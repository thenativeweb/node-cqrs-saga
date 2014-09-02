'use strict';

var debug = require('debug')('saga'),
  async = require('async'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter,
  _ = require('lodash'),
  EventDispatcher = require('./eventDispatcher'),
  uuid = require('node-uuid').v4,
  dotty = require('dotty');

/**
 * ProcessManagement constructor
 * @param {Object} options The options.
 * @constructor
 */
function ProcessManagement(options) {
  EventEmitter.call(this);

  options = options || {};

  if (!options.sagaPath) {
    var err = new Error('Please provide sagaPath in options');
    debug(err);
    throw err;
  }

  this.options = options;

  this.definitions = {
    command: {
      id: 'id',
      name: 'name',
      aggregateId: 'aggregate.id'
//      context: 'context.name',        // optional
//      aggregate: 'aggregate.name',    // optional
//      payload: 'payload',             // optional
//      revision: 'revision',           // optional
//      version: 'version',             // optional
//      meta: 'meta'                    // optional (will be passed directly to corresponding event(s))
    },
    event: {
      correlationId: 'correlationId',
      id: 'id',
      name: 'name',
      aggregateId: 'aggregate.id',
//      context: 'context.name',        // optional
//      aggregate: 'aggregate.name',    // optional
      payload: 'payload',               // optional
      revision: 'revision'              // optional
//      version: 'version',             // optional
//      meta: 'meta'                    // optional (will be passed directly from corresponding command)
    }
  };

  this.idGenerator(function () {
    return uuid().toString();
  });

  this.onCommand(function (evt) {
    debug('emit:', evt);
  });
}

util.inherits(ProcessManagement, EventEmitter);

_.extend(ProcessManagement.prototype, {

  /**
   * Inject definition for command structure.
   * @param   {Object} definition the definition to be injected
   * @returns {Domain}            to be able to chain...
   */
  defineCommand: function (definition) {
    if (!definition || !_.isObject(definition)) {
      var err = new Error('Please pass a valid definition!');
      debug(err);
      throw err;
    }

    this.definitions.command = _.defaults(definition, this.definitions.command);
    return this;
  },

  /**
   * Inject definition for event structure.
   * @param   {Object} definition the definition to be injected
   * @returns {Domain}            to be able to chain...
   */
  defineEvent: function (definition) {
    if (!definition || !_.isObject(definition)) {
      var err = new Error('Please pass a valid definition!');
      debug(err);
      throw err;
    }

    this.definitions.event = _.defaults(definition, this.definitions.event);
    return this;
  },

  /**
   * Inject idGenerator function.
   * @param   {Function}  fn The function to be injected.
   * @returns {Domain}       to be able to chain...
   */
  idGenerator: function (fn) {
    if (!fn || !_.isFunction(fn)) {
      var err = new Error('Please pass a valid function!');
      debug(err);
      throw err;
    }

    if (fn.length === 1) {
      this.getNewId = fn;
      return this;
    }

    this.getNewId = function (callback) {
      callback(null, fn());
    };

    return this;
  },

  /**
   * Inject function for for event notification.
   * @param   {Function} fn the function to be injected
   * @returns {Domain}      to be able to chain...
   */
  onCommand: function (fn) {
    if (!fn || !_.isFunction(fn)) {
      var err = new Error('Please pass a valid function!');
      debug(err);
      throw err;
    }

    if (fn.length === 1) {
      fn = _.wrap(fn, function(func, cmd, callback) {
        func(cmd);
        callback(null);
      });
    }

    this.onCommandHandle = fn;

    return this;
  },

  /**
   * Call this function to initialize the domain.
   * @param {Function} callback the function that will be called when this action has finished [optional]
   *                            `function(err){}`
   */
  init: function (callback) {

    var self = this;

    async.series([
      // load domain files...
      function (callback) {
        debug('load domain files..');
        structureLoader(self.options.domainPath, function (err, tree) {
          if (err) {
            return callback(err);
          }
          self.tree = attachLookupFunctions(tree);
          callback(null);
        });
      },

//      // prepare aggregateLock...
//      function (callback) {
//        debug('prepare aggregateLock...');
//
//        self.aggregateLock.on('connect', function () {
//          self.emit('connect');
//        });
//
//        self.aggregateLock.on('disconnect', function () {
//          self.emit('disconnect');
//        });
//
//        self.aggregateLock.connect(callback);
//      },

      // inject all needed dependencies...
      function (callback) {
        debug('inject all needed dependencies...');

//        self.eventDispatcher = new EventDispatcher(self.tree, self.definitions.event);
//        self.tree.defineOptions({ retryOnConcurrencyTimeout: self.options.retryOnConcurrencyTimeout })
//          .defineCommand(self.definitions.command)
//          .defineEvent(self.definitions.event)
//          .idGenerator(self.getNewId)
//          .useAggregateLock(self.aggregateLock);

        callback(null);
      }
    ], function (err) {
      if (err) {
        debug(err);
      }
      if (callback) callback(err);
    });
  },

  /**
   * Call this function to let the domain handle it.
   * @param {Object}   evt      the event object
   * @param {Function} callback the function that will be called when this action has finished [optional]
   *                            `function(err, cmds, sagaData){}` cmds is of type Array, sagaData is an object
   */
  handle: function (evt, callback) {
    if (!cmd || !_.isObject(cmd)) {
      var err = new Error('Please pass a valid event!');
      debug(err);
      throw err;
    }

  }

});

module.exports = ProcessManagement;
