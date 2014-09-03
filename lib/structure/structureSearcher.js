'use strict';

var debug = require('debug')('saga:structureSearcher'),
  _ = require('lodash');

module.exports = function (sagas) {

  if (!sagas || _.isEmpty(sagas)) {
    debug('no sagas injected');
  }

  return {

    getSagas: function (query) {
      if (!sagas || _.isEmpty(sagas)) {
        debug('no sagas injected');
        return null;
      }
    
      var res = _.filter(sagas, function (s) {
        var isNameEqual = s.name === query.name;
        var isVersionEqual = s.version === query.version;
        var isAggregateEqual = s.aggregate === query.aggregate;
        var isContextEqual = s.context === query.context;
        
        return isNameEqual && isVersionEqual && isAggregateEqual && isContextEqual;
      });
    
      return res;
    },

    defineOptions: function (options) {
      if (!sagas || _.isEmpty(sagas)) {
        debug('no sagas injected');
        return this;
      }
      
      sagas.sagas.forEach(function (s) {
        s.defineOptions(options);
      });
      
      return this;
    },

    defineCommand: function (definition) {
      if (!sagas || _.isEmpty(sagas)) {
        debug('no sagas injected');
        return this;
      }

      sagas.sagas.forEach(function (s) {
        s.defineCommand(definition);
      });
      
      return this;
    },

    defineEvent: function (definition) {
      if (!sagas || _.isEmpty(sagas)) {
        debug('no sagas injected');
        return this;
      }

      sagas.sagas.forEach(function (s) {
        s.defineEvent(definition);
      });

      return this;
    },

//    useAggregateLock: function (aggregateLock) {
//      if (!sagas || _.isEmpty(sagas)) {
//        debug('no sagas injected');
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

      if (!sagas || _.isEmpty(sagas)) {
        debug('no sagas injected');
        return this;
      }

      sagas.sagas.forEach(function (s) {
        s.idGenerator(getNewId);
      });

      return this;
    }

  };

};
