'use strict';

var Definition = require('../definitionBase'),
  util = require('util'),
  _ = require('lodash'),
  dotty = require('dotty'),
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
  this.id = meta.id;
  this.containingProperties = meta.containingProperties || [];
  this.priority = meta.priority || Infinity;

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
    
    if (this.sagaPartFn.length === 2) {
      // do not load from db...
    } else {
      // load from db, if not found create new...
    }
    
    
    // the resulting commands to send should be safed to db and after that they should be dispatched...
    //    ...analog to events with the eventstore (create a "commandstore")
    
    // 1. save saga data (if needed)       // 1. + 2. atomic??? how??? save all in aggData? -> http://stackoverflow.com/questions/16959099/how-to-remove-array-element-in-mongodb
    // 2. save commands
    // 3. callback
    // in pm: 1. publish, 2. setCommandToDispatched


  }

});

module.exports = SagaPart;
