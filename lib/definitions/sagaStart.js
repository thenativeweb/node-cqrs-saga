'use strict';

var Definition = require('../definitionBase'),
  util = require('util'),
  _ = require('lodash'),
  dotty = require('dotty'),
  debug = require('debug')('saga:sagaStart');

/**
 * SagaStart constructor
 * @param {Object}   meta  Meta infos like: { name: 'name', version: 1, payload: 'some.path' }
 * @param {Function} fn    Function handle
 *                         `function(evtData, sagaModel, callback){}`
 * @constructor
 */
function SagaStart (meta, fn) {
  Definition.call(this, meta);

  meta = meta || {};

  if (!fn || !_.isFunction(fn)) {
    var err = new Error('SagaStart function not injected!');
    debug(err);
    throw err;
  }

  this.version = meta.version || 0;
  this.payload = meta.payload || '';

  this.sagaStartFn = fn;
}

util.inherits(SagaStart, Definition);

_.extend(SagaStart.prototype, {



});

module.exports = SagaStart;
