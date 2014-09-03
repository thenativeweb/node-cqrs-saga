'use strict';

var debug = require('debug')('saga'),
  async = require('async'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter,
  _ = require('lodash'),
  EventDispatcher = require('./eventDispatcher'),
  sagastore = require('./sagastore'),
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

  this.sagaStore = sagastore.create(options.sagaStore);

  this.options = options;

  this.definitions = {
    command: {
      id: 'id'
//      name: 'name',                   // optional
//      aggregateId: 'aggregate.id',    // optional
//      context: 'context.name',        // optional
//      aggregate: 'aggregate.name',    // optional
//      payload: 'payload',             // optional
//      revision: 'revision',           // optional
//      version: 'version',             // optional
//      meta: 'meta'                    // optional (will be passed directly to corresponding event(s))
    },
    event: {
//      correlationId: 'correlationId', // optional
      id: 'id',
      name: 'name'
//      aggregateId: 'aggregate.id',    // optional
//      context: 'context.name',        // optional
//      aggregate: 'aggregate.name',    // optional
//      payload: 'payload',             // optional
//      revision: 'revision'            // optional
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
   * @returns {ProcessManagement} to be able to chain...
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
   * @returns {ProcessManagement} to be able to chain...
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
   * @param   {Function}  fn      The function to be injected.
   * @returns {ProcessManagement} to be able to chain...
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
   * @param   {Function} fn       the function to be injected
   * @returns {ProcessManagement} to be able to chain...
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
        structureLoader(self.options.domainPath, function (err, sagas) {
          if (err) {
            return callback(err);
          }
          self.sagas = attachLookupFunctions(sagas);
          callback(null);
        });
      },

      // prepare sagaStore...
      function (callback) {
        debug('prepare sagaStore...');

        self.sagaStore.on('connect', function () {
          self.emit('connect');
        });

        self.sagaStore.on('disconnect', function () {
          self.emit('disconnect');
        });

        self.sagaStore.connect(callback);
      },

      // inject all needed dependencies...
      function (callback) {
        debug('inject all needed dependencies...');

        self.eventDispatcher = new EventDispatcher(self.sagas, self.definitions.event);
        self.sagas.defineOptions({}) // options???
          .defineCommand(self.definitions.command)
          .defineEvent(self.definitions.event)
          .idGenerator(self.getNewId)
          .useSagaStore(self.sagaStore);

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
   * @param {Object}   evt      The event object
   * @param {Function} callback The function that will be called when this action has finished [optional]
   *                            `function(err, cmds, sagaModels){}` cmds and sagaModels are of type Array
   */
  handle: function (evt, callback) {
    if (!evt || !_.isObject(evt)) {
      var err = new Error('Please pass a valid event!');
      debug(err);
      throw err;
    }
    
    var self = this;

    this.eventDispatcher.dispatch(evt, function (errs, sagaModels) {
      var cmds = [];
      
      async.each(sagaModels, function (sagaModel, callback) {
        
        var cmdsToSend = sagaModel.getUndispatchedCommands();

        function setCommandToDispatched (c, clb) {
          debug('set command to dispatched');
          self.sagaStore.setCommandToDispatched(sagaModel.id, c, function (err) {
            if (err) {
              return callback(err);
            }
            cmds.push(c);
            clb(null);
          });
        }
        
        async.each(cmdsToSend, function (cmd, callback) {

          if (self.onCommandHandle) {
            debug('publish a command');
            self.onCommandHandle(cmd, function (err) {
              if (err) {
                debug(err);
                return callback(err);
              }
              setCommandToDispatched(cmd, callback);
            });
          } else {
            setCommandToDispatched(cmd, callback);
          }
          
        }, callback);
        
        
      }, function (err) {
        if (err) {
          debug(err);
        }
        if (callback) {
          callback(errs, cmds, sagaModels);
        }
      });
      
    });
  },

  getTimeoutedSagas: function (callback) {
    this.sagaStore.getTimeoutedSagas(callback);
  },

  getOlderSagas: function (date, callback) {
    this.sagaStore.getOlderSagas(date, callback);
  },
  
  getUndispatchedCommands: function (callback) {
    // callbacks with an array of: { sagaId: '12345', command: {} }
    this.sagaStore.getUndispatchedCommands(callback);
  },
  
  setCommandToDispatched: function (cmdId, sagaId, callback) {
    // delete it... not just mark as dispatched...
    this.sagaStore.setCommandToDispatched(cmdId, sagaId, callback);
  }

});

module.exports = ProcessManagement;
