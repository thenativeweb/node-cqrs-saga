'use strict';

var Definition = require('../definitionBase'),
  util = require('util'),
  _ = require('lodash'),
  dotty = require('dotty'),
  debug = require('debug')('saga:sagaStart');

/**
 * SagaStep constructor
 * @param {Object}   meta  Meta infos like: { name: 'name', version: 1, payload: 'some.path' }
 * @param {Function} fn    Function handle
 *                         `function(evtData, sagaModel, callback){}`
 * @constructor
 */
function SagaStep (meta, fn) {
  Definition.call(this, meta);

  meta = meta || {};

  if (!fn || !_.isFunction(fn)) {
    var err = new Error('SagaStep function not injected!');
    debug(err);
    throw err;
  }

  this.version = meta.version || 0;
  this.payload = meta.payload || '';

  this.sagaStepFn = fn;
}

util.inherits(SagaStep, Definition);

_.extend(SagaStep.prototype, {



});

module.exports = SagaStep;
