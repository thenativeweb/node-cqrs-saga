'use strict';

var SagaPart = require('../sagaPart'),
  util = require('util'),
  _ = require('lodash'),
  debug = require('debug')('saga:sagaStep');

/**
 * SagaStep constructor
 * @param {Object}   meta Meta infos like: { name: 'name', version: 1, payload: 'some.path', id: 'some.path', containingProperties: ['some.path'] }
 * @param {Function} fn   Function handle
 *                        `function(evtData, sagaModel, callback){}`
 * @constructor
 */
function SagaStep (meta, fn) {
  SagaPart.call(this, meta, fn);
}

util.inherits(SagaStep, SagaPart);

_.extend(SagaStep.prototype, {



});

module.exports = SagaStep;
