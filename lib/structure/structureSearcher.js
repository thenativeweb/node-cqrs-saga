'use strict';

var debug = require('debug')('saga:structureSearcher'),
  _ = require('lodash');

module.exports = function (sagas) {

  if (!sagas || _.isEmpty(sagas)) {
    debug('no sagas injected');
  }

  return {

    getInfo: function () {
      if (!sagas || _.isEmpty(sagas)) {
        debug('no sagas injected');
        return null;
      }

      var info = {
        sagas: []
      };

      sagas.forEach(function (s) {
        info.sagas.push({
          name: s.name,
          aggregate: s.aggregate,
          context: s.context,
          version: s.version
        });
      });

      return info;
    },

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

      sagas.forEach(function (s) {
        s.defineOptions(options);
      });

      return this;
    },

    defineCommand: function (definition) {
      if (!sagas || _.isEmpty(sagas)) {
        debug('no sagas injected');
        return this;
      }

      sagas.forEach(function (s) {
        s.defineCommand(definition);
      });

      return this;
    },

    defineEvent: function (definition) {
      if (!sagas || _.isEmpty(sagas)) {
        debug('no sagas injected');
        return this;
      }

      sagas.forEach(function (s) {
        s.defineEvent(definition);
      });

      return this;
    },

    useSagaStore: function (sagaStore) {
      if (!sagaStore || _.isEmpty(sagaStore)) {
        debug('no sagaStore injected');
        return this;
      }

      sagas.forEach(function (s) {
        s.useSagaStore(sagaStore);
      });
      return this;
    },

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

      sagas.forEach(function (s) {
        s.idGenerator(getNewId);
      });

      return this;
    }

  };

};
