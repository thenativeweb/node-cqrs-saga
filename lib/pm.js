'use strict';

var debug = require('debug')('saga'),
  async = require('async'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter,
  _ = require('lodash'),
  EventDispatcher = require('./eventDispatcher'),
  sagastore = require('./store'),
  uuid = require('uuid').v4,
  dotty = require('dotty'),
  RevisionGuard = require('./revisionGuard'),
  revisionGuardStore = require('./revisionGuardStore'),
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

  if (!options.sagaPath && options.sagaPath !== '') {
    var err = new Error('Please provide sagaPath in options');
    debug(err);
    throw err;
  }

  var defaults = {
    commandRejectedEventName: 'commandRejected'
  };

  _.defaults(options, defaults);

  this.sagaStore = sagastore.create(options.sagaStore);

  options.retryOnConcurrencyTimeout = options.retryOnConcurrencyTimeout || 800;

  var defaultRevOpt = {
    queueTimeout: 1000,
    queueTimeoutMaxLoops: 3//,
    // startRevisionNumber: 1
  };

  options.revisionGuard = options.revisionGuard || {};

  _.defaults(options.revisionGuard, defaultRevOpt);

  this.revisionGuardStore = revisionGuardStore.create(options.revisionGuard);

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

  // DO not register a "dummy" onCommand handler because of getTimeoutedSagas handling
  // this.onCommand(function (cmd) {
  //   debug('emit:', cmd);
  // });

  this.onEventMissing(function (info, evt) {
    debug('missing events: ', info, evt);
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
   * Inject function for event missing handle.
   * @param   {Function} fn       the function to be injected
   * @returns {ProcessManager} to be able to chain...
   */
  onEventMissing: function (fn) {
    if (!fn || !_.isFunction(fn)) {
      var err = new Error('Please pass a valid function!');
      debug(err);
      throw err;
    }

    this.onEventMissingHandle = fn;

    return this;
  },

  /**
   * Call this function to initialize the saga.
   * @param {Function} callback the function that will be called when this action has finished [optional]
   *                            `function(err){}`
   */
  init: function (callback) {

    var self = this;

    var warnings = null;

    async.series([
      // load saga files...
      function (callback) {
        if (self.options.sagaPath === '') {
          self.sagas = {};
          debug('empty sagaPath defined so no sagas will be loaded...');
          return callback(null);
        }
        debug('load saga files...');
        structureLoader(self.options.sagaPath, function (err, sagas, warns) {
          if (err) {
            return callback(err);
          }
          warnings = warns;
          self.sagas = attachLookupFunctions(sagas);
          callback(null);
        });
      },

      // prepare infrastructure...
      function (callback) {
        debug('prepare infrastructure...');
        async.parallel([

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

          // prepare revisionGuard...
          function (callback) {
            debug('prepare revisionGuard...');

            self.revisionGuardStore.on('connect', function () {
              self.emit('connect');
            });

            self.revisionGuardStore.on('disconnect', function () {
              self.emit('disconnect');
            });

            self.revisionGuardStore.connect(callback);
          }
        ], callback);
      },

      // inject all needed dependencies...
      function (callback) {
        debug('inject all needed dependencies...');

        self.revisionGuard = new RevisionGuard(self.revisionGuardStore, self.options.revisionGuard);
        self.revisionGuard.onEventMissing(function (info, evt) {
          self.onEventMissingHandle(info, evt);
        });

        if (self.options.sagaPath !== '') {
          self.eventDispatcher = new EventDispatcher(self.sagas, self.definitions.event);
          self.sagas.defineOptions({}) // options???
            .defineCommand(self.definitions.command)
            .defineEvent(self.definitions.event)
            .idGenerator(self.getNewId)
            .useSagaStore(self.sagaStore);
        }

        self.revisionGuard.defineEvent(self.definitions.event);

        callback(null);
      }
    ], function (err) {
      if (err) {
        debug(err);
      }
      if (callback) { callback(err, warnings); }
    });
  },

  /**
   * Returns the saga information.
   * @returns {Object}
   */
  getInfo: function () {
    if (!this.sagas) {
      var err = new Error('Not initialized!');
      debug(err);
      throw err;
    }

    return this.sagas.getInfo();
  },

  /**
   * Call this function to forward it to the dispatcher.
   * @param {Object}   evt      The event object
   * @param {Function} callback The function that will be called when this action has finished [optional]
   *                            `function(errs, evt, notifications){}` notifications is of type Array
   */
  dispatch: function (evt, callback) {
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
          try {
            callback(errs, cmds, sagaModels);
          } catch (e) {
            debug(e);
            console.log(e.stack);
            process.emit('uncaughtException', e);
          }
        }
      });

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

    var workWithRevisionGuard = false;
    if (!!this.definitions.event.revision && dotty.exists(evt, this.definitions.event.revision) &&
      !!this.definitions.event.aggregateId && dotty.exists(evt, this.definitions.event.aggregateId)) {
      workWithRevisionGuard = true;
    }

    if (dotty.get(evt, this.definitions.event.name) === this.options.commandRejectedEventName) {
      workWithRevisionGuard = false;
    }

    if (!workWithRevisionGuard) {
      return this.dispatch(evt, callback);
    }

    this.revisionGuard.guard(evt, function (err, done) {
      if (err) {
        debug(err);
        if (callback) {
          callback([err]);
        }
        return;
      }

      self.dispatch(evt, function (errs, cmds, sagaModels) {
        if (errs) {
          debug(errs);
          if (callback) {
            callback(errs, cmds, sagaModels);
          }
          return;
        }

        done(function (err) {
          if (err) {
            if (!errs) {
              errs = [err];
            } else if (_.isArray(errs)) {
              errs.unshift(err);
            }
            debug(err);
          }

          if (callback) {
            callback(errs, cmds, sagaModels);
          }
        });
      });

    });

  },

  /**
   * Use this function to get all timeouted sagas.
   * @param  {Function} callback The function, that will be called when this action is completed.
   *                             `function(err, sagas){}` saga is of type Array.
   */
  getTimeoutedSagas: function (options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }

    var self = this;

    this.sagaStore.getTimeoutedSagas(options, function (err, sagas) {
      if (err) {
        debug(err);
        return callback(err);
      }

      var sagaModels = [];
      sagas.forEach(function (s) {
        var sagaModel = new SagaModel(s.id);
        sagaModel.set(s);
        sagaModel.actionOnCommit = 'update';

        var calledAddCommandToSend = false;
        sagaModel.addCommandToSend = function (cmd) {
          calledAddCommandToSend = true;
          sagaModel.addUnsentCommand(cmd);
        };
        var calledRemoveTimeout = false;
        var orgRemoveTimeout = sagaModel.removeTimeout;
        sagaModel.removeTimeout = function () {
          calledRemoveTimeout = true;
          orgRemoveTimeout.bind(sagaModel)();
        };
        sagaModel.commit = function (clb) {
          var cmds = calledAddCommandToSend ? sagaModel.getUndispatchedCommands() : [];

          function onAfterCommit(err) {
            if (err) return clb(err);

            function setCommandToDispatched (c, cb) {
              debug('set command to dispatched');
              self.setCommandToDispatched(dotty.get(c, self.definitions.command.id), sagaModel.id, function (err) {
                if (err) {
                  return cb(err);
                }
                sagaModel.removeUnsentCommand(c);
                cb(null);
              });
            }

            if (!self.onCommandHandle) return clb(null);

            async.each(sagaModel.getUndispatchedCommands(), function (cmd, callback) {
              debug('publish a command');
              self.onCommandHandle(cmd, function (err) {
                if (err) {
                  debug(err);
                  return callback(err);
                }
                setCommandToDispatched(cmd, callback);
              });
            }, clb);
          }

          async.each(cmds, function (cmd, fn) {
            if (dotty.exists(cmd, self.definitions.command.id)) {
              return fn(null);
            }

            self.getNewId(function (err, id) {
              if (err) {
                debug(err);
                return fn(err);
              }
              dotty.put(cmd, self.definitions.command.id, id);
              fn(null);
            });
          }, function (err) {
            if (err) {
              debug(err);
              return callback(err);
            }

            if (sagaModel.isDestroyed()) {
              self.removeSaga(sagaModel, onAfterCommit);
            } else if (calledAddCommandToSend) {
              sagaModel.setCommitStamp(new Date());
              var undispCmds = _.map(sagaModel.getUndispatchedCommands(), function (c) {
                return { id: dotty.get(c, self.definitions.command.id), payload: c };
              });
              self.sagaStore.save(sagaModel.toJSON(), undispCmds, onAfterCommit);
            } else if (calledRemoveTimeout) {
              sagaModel.setCommitStamp(new Date());
              self.sagaStore.save(sagaModel.toJSON(), [], onAfterCommit);
            } else {
              var err = new Error('Use commit only to remove a saga or to addCommandToSend!');
              debug(err);
              if (clb) { return clb(err); }
              throw err;
            }
          });
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
        sagaModel.actionOnCommit = 'update';
        var calledRemoveTimeout = false;
        var orgRemoveTimeout = sagaModel.removeTimeout;
        sagaModel.removeTimeout = function () {
          calledRemoveTimeout = true;
          orgRemoveTimeout.bind(sagaModel)();
        };
        sagaModel.commit = function (clb) {
          if (sagaModel.isDestroyed()) {
            self.removeSaga(sagaModel, clb);
          } else if (calledRemoveTimeout) {
            sagaModel.setCommitStamp(new Date());
            self.sagaStore.save(sagaModel.toJSON(), [], clb);
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
  getUndispatchedCommands: function (options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }
    this.sagaStore.getUndispatchedCommands(options, callback);
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
  },

  /**
   * Gets the last event.
   * @param {Function} callback The function, that will be called when this action is completed.
   *                            `function(err, evt){}` evt is of type Object.
   */
  getLastEvent: function (callback) {
    this.revisionGuardStore.getLastEvent(callback);
  }

});

module.exports = ProcessManagement;
