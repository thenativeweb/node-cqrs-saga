'use strict';

var debug = require('debug')('saga'),
  async = require('async'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter,
  _ = require('lodash'),
  EventDispatcher = require('./eventDispatcher'),
  sagastore = require('./store'),
  uuid = require('node-uuid').v4,
  dotty = require('dotty'),
  SagaModel = require('./sagaModel'),
  structureLoader = require('./structure/structureLoader'),
  attachLookupFunctions = require('./structure/structureSearcher');

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

  options.retryOnConcurrencyTimeout = options.retryOnConcurrencyTimeout || 800;

  this.options = options;

  this.definitions = {
    command: {
      id: 'id'
////      name: 'name',                   // optional
////      aggregateId: 'aggregate.id',    // optional
////      context: 'context.name',        // optional
////      aggregate: 'aggregate.name',    // optional
////      payload: 'payload',             // optional
////      revision: 'revision',           // optional
////      version: 'version',             // optional
//      meta: 'meta'                    // optional (will be passed directly to corresponding event(s))
    },
    event: {
////      correlationId: 'correlationId', // optional
////      id: 'id',                       //optional
      name: 'name'
////      aggregateId: 'aggregate.id',    // optional
//      context: 'context.name',        // optional
//      aggregate: 'aggregate.name',    // optional
////      payload: 'payload',             // optional
////      revision: 'revision'            // optional
//      version: 'version',             // optional
//      meta: 'meta'                    // optional (will be passed directly from corresponding command)
    }
  };

  this.idGenerator(function () {
    return uuid().toString();
  });

  this.onCommand(function (cmd) {
    debug('emit:', cmd);
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
   * Call this function to initialize the saga.
   * @param {Function} callback the function that will be called when this action has finished [optional]
   *                            `function(err){}`
   */
  init: function (callback) {

    var self = this;

    async.series([
      // load saga files...
      function (callback) {
        debug('load saga files..');
        structureLoader(self.options.sagaPath, function (err, sagas) {
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
      if (callback) { callback(err); }
    });
  },

  /**
   * Call this function to let the saga handle it.
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
      
      if (!sagaModels || sagaModels.length === 0) {
        if (callback) {
          callback(errs, cmds, []);
        }
        return;
      }
      
      async.each(sagaModels, function (sagaModel, callback) {
        
        var cmdsToSend = sagaModel.getUndispatchedCommands();

        function setCommandToDispatched (c, clb) {
          debug('set command to dispatched');
          self.setCommandToDispatched(dotty.get(c, self.definitions.command.id), sagaModel.id, function (err) {
            if (err) {
              return clb(err);
            }
            cmds.push(c);
            sagaModel.removeUnsentCommand(c);
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
          if (!errs) {
            errs = [err];
          } else if (_.isArray(errs)) {
            errs.unshift(err);
          }
          debug(err);
        }
        if (callback) {
//          var sagaModelsData = _.map(sagaModels, function (s) {
//            var json = s.toJSON();
//            if (s.isDestroyed()) {
//              json._destroyed = true;
//            }
//            return json;
//          });
//          callback(errs, cmds, sagaModelsData);
          callback(errs, cmds, sagaModels);
        }
      });
      
    });
  },

  /**
   * Use this function to get all timeouted sagas.
   * @param  {Function} callback The function, that will be called when this action is completed.
   *                             `function(err, sagas){}` saga is of type Array.
   */
  getTimeoutedSagas: function (callback) {
    var self = this;
    
    this.sagaStore.getTimeoutedSagas(function (err, sagas) {
      if (err) {
        debug(err);
        return callback(err);
      }
      
      var sagaModels = [];
      sagas.forEach(function (s) {
        var sagaModel = new SagaModel(s.id);
        sagaModel.set(s);
        sagaModel.commit = function (clb) {
          if (sagaModel.isDestroyed()) {
            self.removeSaga(sagaModel, clb);
          } else {
            var err = new Error('Use commit only to remove a saga!');
            debug(err);
            if (clb) { return clb(err); }
            throw err;
          }
        };
        sagaModels.push(sagaModel);
      });
      
      callback(null, sagaModels);
    });
  },

  /**
   * Use this function to get all sagas that are older then the passed date.
   * @param {Date}     date     The date
   * @param {Function} callback The function, that will be called when this action is completed.
   *                            `function(err, sagas){}` saga is of type Array.
   */
  getOlderSagas: function (date, callback) {
    var self = this;
    
    this.sagaStore.getOlderSagas(date, function (err, sagas) {
      if (err) {
        debug(err);
        return callback(err);
      }
      var sagaModels = [];
      sagas.forEach(function (s) {
        var sagaModel = new SagaModel(s.id);
        sagaModel.set(s);
        sagaModel.commit = function (clb) {
          if (sagaModel.isDestroyed()) {
            self.removeSaga(sagaModel, clb);
          } else {
            var err = new Error('Use commit only to remove a saga!');
            debug(err);
            if (clb) { return clb(err); }
            throw err;
          }
        };
        sagaModels.push(sagaModel);
      });

      callback(null, sagaModels);
    });
  },

  /**
   * Use this function to get all undispatched commands.
   * @param {Function} callback The function, that will be called when this action is completed.
   *                            `function(err, cmdsSagaMap){}` cmdsSagaMap is of type Array.
   */
  getUndispatchedCommands: function (callback) {
    this.sagaStore.getUndispatchedCommands(callback);
  },

  /**
   * Use this function to mark a command as dispatched. (will remove it from the db)
   * @param {String}   cmdId    The command id
   * @param {String}   sagaId   The saga id
   * @param {Function} callback The function, that will be called when this action is completed. [optional]
   *                            `function(err){}`
   */
  setCommandToDispatched: function (cmdId, sagaId, callback) {
    this.sagaStore.setCommandToDispatched(cmdId, sagaId, callback);
  },

  /**
   * Use this function to remove the matched saga.
   * @param {String}   saga     The id of the saga or the saga itself
   * @param {Function} callback The function, that will be called when this action is completed. [optional]
   *                             `function(err){}`
   */
  removeSaga: function (saga, callback) {
    var sagaId = saga.id || saga;
    this.sagaStore.remove(sagaId, callback);
  }

});

module.exports = ProcessManagement;
