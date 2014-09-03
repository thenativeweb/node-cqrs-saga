'use strict';

var Definition = require('../definitionBase'),
  util = require('util'),
  _ = require('lodash'),
  dotty = require('dotty'),
  async = require('async'),
  debug = require('debug')('saga:saga');

/**
 * SagaPart constructor
 * @param {Object}   meta Meta infos like: { name: 'name', version: 1, payload: 'some.path', id: 'some.path', containingProperties: ['some.path'] }
 * @param {Function} fn   Function handle
 *                        `function(evtData, sagaModel, callback){}`
 * @constructor
 */
function SagaPart (meta, fn) {
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

util.inherits(SagaPart, Definition);

_.extend(SagaPart.prototype, {

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
        self.sagaStore.get(id, callback);
      },

      function (sagaModel, callback) {
        // attach commit function
        // attach addCommandToSend function
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
        // detach addCommandToSend function
        callback(null, sagaModel);
      }
      
    ], callback);

  }

});

module.exports = SagaPart;
