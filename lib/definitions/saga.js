'use strict';

var Definition = require('../definitionBase'),
  util = require('util'),
  _ = require('lodash'),
  dotty = require('dotty'),
  async = require('async'),
  debug = require('debug')('saga:saga');

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
  this.version = meta.version || 0;
  this.payload = meta.payload || '';
  this.id = meta.id || null;
  this.containingProperties = meta.containingProperties || [];
  this.priority = meta.priority || Infinity;

  this.sagaPartFn = fn;
}

util.inherits(Saga, Definition);

_.extend(Saga.prototype, {

  /**
   * Inject idGenerator function.
   * @param   {Function}  fn The function to be injected.
   * @returns {Aggregate}    to be able to chain...
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
  
  getPayload: function (evt) {
    if (!this.payload || this.payload === '') {
      return evt;
    }
    return dotty.get(evt, this.payload);
  },

  checkForId: function (cmds, clb) {
    var self = this;
    async.each(cmds, function (cmd, fn) {
      if (dotty.exists(cmd, self.definition.command.id)) {
        return fn(null);
      }

      self.getNewId(function (err, id) {
        if (err) {
          debug(err);
          return fn(err);
        }
        dotty.put(cmd, self.definition.command.id, id);
        fn(null);
      });
    }, clb);
  },

  /**
   * Handles the passed event.
   * @param {Object}   evt      The passed event.
   * @param {Function} callback The function, that will be called when this action is completed.
   *                            `function(err, sagaModel){}`
   */
  handle: function (evt, callback) {
    var self = this;
    async.waterfall([
      
      function (callback) {
        if (!self.id || !dotty.exists(evt, self.id)) {
          self.sagaStore.getNewId(callback);
        } else {
          callback(null, dotty.get(evt, self.id));
        }
      },
      
      function (id, callback) {
        self.sagaStore.get(id, function (err, data) {
          if (err) {
            return callback(err);
          }
          var sagaModel = new SagaModel(id);
          sagaModel.set(data);
          callback(null, sagaModel);
        });
      },

      function (sagaModel, callback) {
        
        // attach commit function
        debug('attach commit function');
        sagaModel.commit = function (clb) {
          if (sagaModel.isDestroyed()) {
            self.sagaStore.remove(sagaModel.id, clb);
          } else {
            async.parallel([
              function (callback) {
                self.checkForId(sagaModel.getUnsentCommands(), callback)
              },
              function (callback) {
                self.checkForId(sagaModel.getTimeoutCommands(), callback)
              }
            ], function (err) {
              if (err) {
                debug(err);
                return callback(err);
              }

              sagaModel.setCommitStamp(new Date());

              self.sagaStore.save(sagaModel.toJSON(), sagaModel.getUnsentCommands(), clb);
            });
          }
        };
        
        // attach addCommandToSend function
        debug('attach addCommandToSend function');
        sagaModel.addCommandToSend = function (cmd) {
          if (!dotty.exists(cmd, self.definition.command.meta) && dotty.exists(evt, self.definition.event.meta) &&
              !!self.definition.command.meta && !!self.definition.event.meta) {
            dotty.put(cmd, self.definition.command.meta, dotty.get(evt, self.definition.event.meta));
          }
          
          sagaModel.addUnsentCommand(cmd);
        };

        // attach defineTimeout function
        debug('attach defineTimeout function');
        sagaModel.defineTimeout = function (date, cmds) {
          cmds = cmds || [];
          if (!_.isArray(cmds)) {
            cmds = [cmds];
          }
          
          cmds.forEach(function (cmd) {
            if (!dotty.exists(cmd, self.definition.command.meta) && dotty.exists(evt, self.definition.event.meta) &&
              !!self.definition.command.meta && !!self.definition.event.meta) {
              dotty.put(cmd, self.definition.command.meta, dotty.get(evt, self.definition.event.meta));
            }
          });
          
          sagaModel.addTimeout(date, cmds);
        };
        
        callback(null, sagaModel);
      },
      
      function (sagaModel, callback) {
        self.sagaPartFn(self.getPayload(evt), sagaModel, function (err) {
          if (callback) {
            return callback(err);
          }
          callback(null, sagaModel);
        });
      },

      function (sagaModel, callback) {
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
        callback(null, sagaModel);
      }
      
    ], callback);

  }

});

module.exports = Saga;
