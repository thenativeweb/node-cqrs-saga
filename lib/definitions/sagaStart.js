'use strict';

var SagaPart = require('../sagaPart'),
  util = require('util'),
  _ = require('lodash'),
  debug = require('debug')('saga:sagaStart');

/**
 * SagaStart constructor
 * @param {Object}   meta Meta infos like: { name: 'name', version: 1, payload: 'some.path', id: 'some.path', containingProperties: ['some.path'] }
 * @param {Function} fn   Function handle
 *                        `function(evtData, sagaModel, callback){}`
 * @constructor
 */
function SagaStart (meta, fn) {
  SagaPart.call(this, meta, fn);
}

util.inherits(SagaStart, SagaPart);

_.extend(SagaStart.prototype, {



});

module.exports = SagaStart;
