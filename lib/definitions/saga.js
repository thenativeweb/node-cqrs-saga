'use strict';

var Definition = require('../definitionBase'),
  SagaModel = require('../sagaModel'),
  ConcurrencyError = require('../errors/concurrencyError'),
  util = require('util'),
  _ = require('lodash'),
  dotty = require('dotty'),
  async = require('async'),
  uuid = require('uuid').v4,
  debug = require('debug')('saga:handle');

/**
 * Saga constructor
 * @param {Object}   meta Meta infos like: { name: 'name', version: 1, payload: 'some.path', id: 'some.path', containingProperties: ['some.path'] }
 * @param {Function} fn   Function handle
 *                        `function(evtData, sagaModel, callback){}`
 * @constructor
 */
function Saga (meta, fn) {
  Definition.call(this, meta);

  meta = meta || {};

  if (!fn || !_.isFunction(fn)) {
    var err = new Error('Saga function not injected!');
    debug(err);
    throw err;
  }

  this.aggregate = meta.aggregate || null;
  this.context = meta.context || null;
  this.existing = meta.existing || false;
  this.version = meta.version || 0;
  this.payload = meta.payload || '';
  this.id = meta.id || null;
  this.containingProperties = meta.containingProperties || [];
  this.priority = meta.priority || Infinity;

  this.sagaFn = function (evt, saga, clb) {
    var wrappedCallback = function () {
      try {
        clb.apply(this, _.toArray(arguments));
      } catch (e) {
        debug(e);
        process.emit('uncaughtException', e);
      }
    };

    try {
      fn.call(this, evt, saga, wrappedCallback);
    } catch (e) {
      debug(e);
      process.emit('uncaughtException', e);
    }
  };

  this.idGenerator(function () {
    return uuid().toString();
  });

  this.defineShouldHandle(function (evt, saga) {
    return true;
  });
}

util.inherits(Saga, Definition);

/**
 * Returns a random number between passed values of min and max.
 * @param {Number} min The minimum value of the resulting random number.
 * @param {Number} max The maximum value of the resulting random number.
 * @returns {Number}
 */
function randomBetween(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

_.extend(Saga.prototype, {

  /**
   * Inject idGenerator function.
   * @param   {Function}  fn The function to be injected.
   * @returns {Saga}    to be able to chain...
   */
  idGenerator: function (fn) {
    if (fn.length === 0) {
      fn = _.wrap(fn, function(func, callback) {
        callback(null, func());
      });
    }

    this.getNewId = fn;

    return this;
  },

  /**
   * Injects the needed sagaStore.
   * @param {Object} sagaStore The sagaStore object to inject.
   */
  useSagaStore: function (sagaStore) {
    if (!sagaStore || !_.isObject(sagaStore)) {
      var err = new Error('Please pass a valid sagaStore!');
      debug(err);
      throw err;
    }
    this.sagaStore = sagaStore;
  },

  /**
   * Returns the requested payload of the passed command.
   * @param {Object} evt The passed event.
   * @returns {Object}
   */
  getPayload: function (evt) {
    if (!this.payload || this.payload === '') {
      return evt;
    }
    return dotty.get(evt, this.payload);
  },

  /**
   * Checks if the passed commands have a command id. If not it will generate a new one and extend the command with it.
   * @param {Array}    cmds     The passed commands array.
   * @param {Function} callback The function, that will be called when this action is completed.
   *                            `function(err){}`
   */
  checkForId: function (cmds, callback) {
    if (!cmds || cmds.length === 0) {
      return callback(null);
    }

    var self = this;
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
    }, callback);
  },

  /**
   * Returns true if the passed event contains all requested properties.
   * @param {Object} evt The passed event.
   * @returns {boolean}
   */
  doesContainProperties: function (evt) {
    for (var i = 0, len = this.containingProperties.length; i < len; i++) {
      var prop = this.containingProperties[i];
      if (!dotty.exists(evt, prop)) {
        return false;
      }
    }
    return true;
  },

  /**
   * Handles the passed event.
   * @param {Object}   evt      The passed event.
   * @param {Function} callback The function, that will be called when this action is completed.
   *                            `function(err, sagaModel){}`
   */
  handle: function (evt, callback) {

    if (!this.doesContainProperties(evt)) {
      debug('does not match the containing properties check');
      return callback(null, null);
    }

    function retry (retryIn) {
      if (_.isNumber(retryIn)) {
        retryIn = randomBetween(0, retryIn);
      }

      if (_.isObject(retryIn) && _.isNumber(retryIn.from) && _.isNumber(retryIn.to)) {
        retryIn = randomBetween(retryIn.from, retryIn.to);
      }

      if (!_.isNumber(retryIn) || retryIn === 0) {
        retryIn = randomBetween(0, self.options ? self.options.retryOnConcurrencyTimeout : 800);
      }

      debug('retry in ' + retryIn + 'ms');
      setTimeout(function() {
        self.handle(evt, callback);
      }, retryIn);
    }

    var self = this;

    async.waterfall([

      function (callb) {
        if (!self.id || !dotty.exists(evt, self.id)) {
          debug('has no id, generate new one');

          if (!self.getNewIdForThisSaga) {
            return self.sagaStore.getNewId(callb);
          }

          self.getNewIdForThisSaga(evt, callb);
        } else {
          debug('already has an id');
          callb(null, dotty.get(evt, self.id));
        }
      },

      function (id, callb) {
        self.sagaStore.get(id, function (err, data) {
          if (err) {
            return callb(err);
          }

          if (!data && self.existing) {
            debug('this saga only wants to be executed, if already existing');
            return callback(null, null);
          }

          var sagaModel = new SagaModel(id);
          if (data) {
            sagaModel.set(data);
            sagaModel.actionOnCommit = 'update';
          }
          callb(null, sagaModel);
        });
      },

      function (sagaModel, callb) {

        // attach commit function
        debug('attach commit function');

        /**
         * Commits the saga data and its commands.
         * @param {Function} clb The function, that will be called when this action is completed.
         *                       `function(err){}`
         */
        sagaModel.commit = function (clb) {
          async.parallel([
            function (callback) {
              self.checkForId(sagaModel.getUndispatchedCommands(), callback);
            },
            function (callback) {
              self.checkForId(sagaModel.getTimeoutCommands(), callback);
            }
          ], function (err) {
            if (err) {
              debug(err);
              return callback(err);
            }
            if (sagaModel.isDestroyed()) {
              self.sagaStore.remove(sagaModel.id, clb);
            } else {
              sagaModel.setCommitStamp(new Date());

              var undispCmds = _.map(sagaModel.getUndispatchedCommands(), function (c) {
                return { id: dotty.get(c, self.definitions.command.id), payload: c };
              });

              self.sagaStore.save(sagaModel.toJSON(), undispCmds, function (err) {
                if (err instanceof ConcurrencyError) {
                  retry(clb);
                  return;
                }
                clb(err);
              });
            }
          });
        };

        // attach addCommandToSend function
        debug('attach addCommandToSend function');
        /**
         * Adds the passed command to this model.
         * @param {Object} cmd The command that should be sent.
         */
        sagaModel.addCommandToSend = function (cmd) {
          if (!dotty.exists(cmd, self.definitions.command.meta) && dotty.exists(evt, self.definitions.event.meta) &&
            !!self.definitions.command.meta && !!self.definitions.event.meta) {
            dotty.put(cmd, self.definitions.command.meta, dotty.get(evt, self.definitions.event.meta));
          }

          sagaModel.addUnsentCommand(cmd);
        };

        // attach defineTimeout function
        debug('attach defineTimeout function');
        /**
         * Defines a timeout date and optional timeout commands, and adds them to this model.
         * @param {Date}  date The timeout date.
         * @param {Array} cmds The array of commands.
         */
        sagaModel.defineTimeout = function (date, cmds) {
          cmds = cmds || [];
          if (!_.isArray(cmds)) {
            cmds = [cmds];
          }

          cmds.forEach(function (cmd) {
            if (!dotty.exists(cmd, self.definitions.command.meta) && dotty.exists(evt, self.definitions.event.meta) &&
              !!self.definitions.command.meta && !!self.definitions.event.meta) {
              dotty.put(cmd, self.definitions.command.meta, dotty.get(evt, self.definitions.event.meta));
            }
          });

          sagaModel.addTimeout(date, cmds);
        };

        callb(null, sagaModel);
      },

      function (sagaModel, callb) {
        var sagaThis = {
          retry: function () {
            if (arguments.length === 0) {
              return retry();
            }

            return retry(arguments[0]);
          }
        };

        self.shouldHandle(evt, sagaModel, function (err, doHandle) {
          if (err) {
            return callb(err);
          }

          if (!doHandle) {
            return callb(null, sagaModel);
          }

          self.sagaFn.call(sagaThis, self.getPayload(evt), sagaModel, function (err) {
            if (err) {
              return callb(err);
            }
            callb(null, sagaModel);
          });
        });
      },

      function (sagaModel, callb) {
        // detach commit function
        debug('detach commit function');
        if (sagaModel.commit) {
          delete sagaModel.commit;
        }

        // detach addCommandToSend function
        debug('detach addCommandToSend function');
        if (sagaModel.addCommandToSend) {
          delete sagaModel.addCommandToSend;
        }

        // detach defineTimeout function
        debug('detach defineTimeout function');
        if (sagaModel.defineTimeout) {
          delete sagaModel.defineTimeout;
        }
        callb(null, sagaModel);
      }

    ], callback);
  },

  /**
   * Inject idGenerator function if no id found.
   * @param   {Function}  fn      The function to be injected.
   * @returns {Saga} to be able to chain...
   */
  useAsId: function (fn) {
    if (!fn || !_.isFunction(fn)) {
      var err = new Error('Please pass a valid function!');
      debug(err);
      throw err;
    }

    if (fn.length === 2) {
      this.getNewIdForThisSaga = fn;
      return this;
    }

    this.getNewIdForThisSaga = function (evt, callback) {
      callback(null, fn(evt));
    };

    return this;
  },

  /**
   * Inject shouldHandle function.
   * @param   {Function}  fn      The function to be injected.
   * @returns {Saga} to be able to chain...
   */
  defineShouldHandle: function (fn) {
    if (!fn || !_.isFunction(fn)) {
      var err = new Error('Please pass a valid function!');
      debug(err);
      throw err;
    }

    if (fn.length === 3) {
      this.shouldHandle = fn;
      return this;
    }

    this.shouldHandle = function (evt, saga, callback) {
      callback(null, fn(evt, saga));
    };

    var unwrappedShouldHandle = this.shouldHandle;

    this.shouldHandle = function (evt, saga, clb) {
      var wrappedCallback = function () {
        try {
          clb.apply(this, _.toArray(arguments));
        } catch (e) {
          debug(e);
          process.emit('uncaughtException', e);
        }
      };

      try {
        unwrappedShouldHandle.call(this, evt, saga, wrappedCallback);
      } catch (e) {
        debug(e);
        process.emit('uncaughtException', e);
      }
    };

    return this;
  }

});

module.exports = Saga;
