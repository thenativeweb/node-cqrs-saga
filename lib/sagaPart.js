'use strict';

var Definition = require('./definitionBase'),
  util = require('util'),
  _ = require('lodash'),
  dotty = require('dotty'),
  debug = require('debug')('saga:sagaPart');

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

  this.aggregate = meta.aggregate;
  this.context = meta.context;
  this.version = meta.version || 0;
  this.payload = meta.payload || '';
  this.id = meta.id;
  this.containingProperties = meta.containingProperties || [];

  this.sagaPartFn = fn;
}

util.inherits(SagaPart, Definition);

_.extend(SagaPart.prototype, {

  /**
   * Handles the passed event
   * @param {Object}   evt      The passed event.
   * @param {Function} callback The function, that will be called when this action is completed.
   *                            `function(err, cmds){}`
   */
  handle: function (evt, callback) {
    
    
    // do the magic!!!
    
    
  }

});

module.exports = SagaPart;
