'use strict';

var debug = require('debug')('saga:structureSearcher'),
  _ = require('lodash');

module.exports = function (tree) {

  if (!tree || _.isEmpty(tree)) {
    debug('no tree injected');
  }

  return {

    getSagas: function (query) {
      if (!tree || _.isEmpty(tree)) {
        debug('no tree injected');
        return null;
      }
    
      var res = [];
      
      
      // search here
      
    
      return res;
    },

    defineOptions: function (options) {
      if (!tree || _.isEmpty(tree)) {
        debug('no tree injected');
        return this;
      }
      
      tree.sagas.forEach(function (s) {
        s.defineOptions(options);
      });
      
      return this;
    },

    defineCommand: function (definition) {
      if (!tree || _.isEmpty(tree)) {
        debug('no tree injected');
        return this;
      }

      tree.sagas.forEach(function (s) {
        s.defineCommand(definition);
      });
      
      return this;
    },

    defineEvent: function (definition) {
      if (!tree || _.isEmpty(tree)) {
        debug('no tree injected');
        return this;
      }

      tree.sagas.forEach(function (s) {
        s.defineEvent(definition);
      });

      return this;
    },

//    useAggregateLock: function (aggregateLock) {
//      if (!tree || _.isEmpty(tree)) {
//        debug('no tree injected');
//        return this;
//      }
//
//      this.getContexts().forEach(function (ctx) {
//        ctx.getAggregates().forEach(function (aggr) {
//          if (aggr.defaultCommandHandler) {
//            aggr.defaultCommandHandler.useAggregateLock(aggregateLock);
//          }
//          aggr.getCommandHandlers().forEach(function (cmdHndl) {
//            cmdHndl.useAggregateLock(aggregateLock);
//          });
//        });
//      });
//      return this;
//    },

    idGenerator: function (getNewId) {
      if (!getNewId || !_.isFunction(getNewId)) {
        var err = new Error('Please pass a valid function!');
        debug(err);
        throw err;
      }

      if (!tree || _.isEmpty(tree)) {
        debug('no tree injected');
        return this;
      }

      tree.sagas.forEach(function (s) {
        s.idGenerator(getNewId);
      });

      return this;
    }

  };

};
