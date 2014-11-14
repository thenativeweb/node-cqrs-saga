'use strict';

var debug = require('debug')('saga:revisionGuard'),
  _ = require('lodash'),
  async = require('async'),
  Queue = require('./orderQueue'),
  ConcurrencyError = require('./errors/concurrencyError'),
  AlreadyHandledError = require('./errors/alreadyHandledError'),
  dotty = require('dotty');

/**
 * RevisionGuard constructor
 * @param {Object} store   The store object.
 * @param {Object} options The options object.
 * @constructor
 */
function RevisionGuard (store, options) {
  options = options || {};

  var defaults = {
    queueTimeout: 1000,
    queueTimeoutMaxLoops: 3
  };
  
  _.defaults(options, defaults);
  
  this.options = options;

  if (!store || !_.isObject(store)) {
    var err = new Error('store not injected!');
    debug(err);
    throw err;
  }
  
  this.store = store;

  this.definition = {
    correlationId: 'correlationId', // optional
    id: 'id',                       // optional
    name: 'name',                   // optional
//    aggregateId: 'aggregate.id',    // optional
//    context: 'context.name',        // optional
//    aggregate: 'aggregate.name',    // optional
    payload: 'payload'              // optional
//    revision: 'revision'            // optional
//    version: 'version',             // optional
//    meta: 'meta'                    // optional, if defined theses values will be copied to the notification (can be used to transport information like userId, etc..)
  };

  this.queue = new Queue({ queueTimeout: this.options.queueTimeout });

  this.onEventMissing(function (info, evt) {
    debug('missing events: ', info, evt);
  });
}

/**
 * Returns a random number between passed values of min and max.
 * @param {Number} min The minimum value of the resulting random number.
 * @param {Number} max The maximum value of the resulting random number.
 * @returns {Number}
 */
function randomBetween(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

RevisionGuard.prototype = {
  
  /**
   * Inject definition for event structure.
   * @param   {Object} definition the definition to be injected
   */
  defineEvent: function (definition) {
    if (!_.isObject(definition)) {
      throw new Error('Please pass in an object');
    }
    this.definition = _.defaults(definition, this.definition);
    return this;
  },

  /**
   * Inject function for event missing handle.
   * @param   {Function} fn       the function to be injected
   * @returns {RevisionGuard} to be able to chain...
   */
  onEventMissing: function (fn) {
    if (!fn || !_.isFunction(fn)) {
      var err = new Error('Please pass a valid function!');
      debug(err);
      throw err;
    }

    if (fn.length === 1) {
      fn = _.wrap(fn, function(func, info, evt, callback) {
        func(info, evt);
        callback(null);
      });
    }

    this.onEventMissingHandle = fn;

    return this;
  },

  /**
   * Returns the concatenated id (more unique)
   * @param {Object}   evt The passed eventt.
   * @returns {string}
   */
  getConcatenatedId: function (evt) {
    var aggregateId = '';
    if (dotty.exists(evt, this.definition.aggregateId)) {
      aggregateId = dotty.get(evt, this.definition.aggregateId);
    }

    var aggregate = '';
    if (dotty.exists(evt, this.definition.aggregate)) {
      aggregate = dotty.get(evt, this.definition.aggregate);
    }

    var context = '';
    if (dotty.exists(evt, this.definition.context)) {
      context = dotty.get(evt, this.definition.context);
    }

    return context + aggregate + aggregateId;
  },

  /**
   * Queues an event with its callback by aggregateId
   * @param {String}   aggId    The aggregate id.
   * @param {Object}   evt      The event object.
   * @param {Function} callback The event callback.
   */
  queueEvent: function (aggId, evt, callback) {
    var self = this;
    var evtId = dotty.get(evt, this.definition.id);
    var revInEvt = dotty.get(evt, this.definition.revision);

    var concatenatedId = this.getConcatenatedId(evt);
    
    this.queue.push(concatenatedId, evtId, evt, callback, function (loopCount, waitAgain) {
      self.store.get(concatenatedId, function (err, revInStore) {
        if (err) {
          debug(err);
          self.store.remove(concatenatedId, evtId);
          return callback(err);
        }

        if (revInEvt === revInStore) {
          debug('revision match');
          callback(null, function (clb) {
            self.finishGuard(evt, revInStore, clb);
          });
          return;
        }

        if (loopCount < self.options.queueTimeoutMaxLoops) {
          debug('revision mismatch, try/wait again...');
          return waitAgain();
        }
        
        debug('event timeouted');
        // try to replay depending from id and evt...
        var info = {
          aggregateId: aggId,
          aggregateRevision: !!self.definition.revision ? dotty.get(evt, self.definition.revision) : undefined,
          aggregate: !!self.definition.aggregate ? dotty.get(evt, self.definition.aggregate) : undefined,
          context: !!self.definition.context ? dotty.get(evt, self.definition.context) : undefined,
          guardRevision: revInStore
        };
        self.onEventMissingHandle(info, evt);
      });
    });
  },

  /**
   * Finishes the guard stuff and save the new revision to store.
   * @param {Object}   evt        The event object.
   * @param {Number}   revInStore The actual revision number in store.
   * @param {Function} callback   The function, that will be called when this action is completed.
   *                              `function(err){}`
   */
  finishGuard: function (evt, revInStore, callback) {
    var aggId = dotty.get(evt, this.definition.aggregateId);
    var evtId = dotty.get(evt, this.definition.id);
    var revInEvt = dotty.get(evt, this.definition.revision);
    
    var concatenatedId = this.getConcatenatedId(evt);
    
    var self = this;
    
    this.store.set(concatenatedId, revInEvt + 1, revInStore, function (err) {
      if (err) {
        debug(err);
        if (err instanceof ConcurrencyError) {
          var retryIn = randomBetween(0, self.options.retryOnConcurrencyTimeout || 800);
          debug('retry in ' + retryIn + 'ms');
          setTimeout(function() {
            self.guard(evt, callback);
          }, retryIn);
          return;
        }

        return callback(err);
      }

      self.queue.remove(concatenatedId, evtId);
      callback(null);
      
      var pendingEvents = self.queue.get(concatenatedId);
      if (!pendingEvents || pendingEvents.length === 0) return debug('no other pending event found');

      var nextEvent = _.find(pendingEvents, function (e) {
        var revInEvt = dotty.get(e.payload, self.definition.revision);
        return revInEvt === revInStore;
      });
      if (!nextEvent) return debug('no next pending event found');

      debug('found next pending event, guard');
      self.guard(nextEvent.payload, nextEvent.callback);
    });
  },

  /**
   * Guard this event. Check for order and check if missing events...
   * @param {Object} evt The event object.
   * @param {Function} callback The event callback.
   */
  guard: function (evt, callback) {
    if (!this.definition.aggregateId || !dotty.exists(evt, this.definition.aggregateId) ||
        !this.definition.revision || !dotty.exists(evt, this.definition.revision)) {
      var err = new Error('Please define an aggregateId!');
      debug(err);
      return callback(err);
    }
    
    var self = this;
    
    var aggId = dotty.get(evt, this.definition.aggregateId);
    var revInEvt = dotty.get(evt, this.definition.revision);
    
    var concatenatedId = this.getConcatenatedId(evt);

    function proceed (revInStore) {
      if (!revInStore) {
        debug('first revision to store');
        callback(null, function (clb) {
          self.finishGuard(evt, revInStore, clb);
        });
        return;
      }
      
      if (revInEvt < revInStore) {
        debug('event already handled');
        callback(new AlreadyHandledError(), function (clb) {
          clb(null);
        });
        return;
      }
      
      if (revInEvt > revInStore) {
        debug('queue event');
        self.queueEvent(aggId, evt, callback);
        return;
      }

      callback(null, function (clb) {
        self.finishGuard(evt, revInStore, clb);
      });
    }

    function retry (max, loop) {
      setTimeout(function () {
        self.store.get(concatenatedId, function(err, revInStore) {
          if (err) {
            debug(err);
            return callback(err);
          }
          
          if (loop <= 0) {
            return proceed(revInStore);
          }

          if (!revInStore && revInEvt !== 1) {
            retry(max, --loop);
            return;
          }

          proceed(revInStore);
        });
      }, randomBetween(max / 5, max));
    }
    
    process.nextTick(function () {
      self.store.get(concatenatedId, function (err, revInStore) {
        if (err) {
          debug(err);
          return callback(err);
        }

        if (!revInStore && revInEvt !== 1) {
          var max = (self.options.queueTimeout * self.options.queueTimeoutMaxLoops) / 3;
          max = max < 10 ? 10 : max;
          retry(max, self.options.queueTimeoutMaxLoops);
          return;
        }

        proceed(revInStore);
      });
    });
  }

};

module.exports = RevisionGuard;

