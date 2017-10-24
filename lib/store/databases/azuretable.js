'use strict';

var util = require('util'),
  Store = require('../base'),
  debug = require('debug')('saga:azuretable'),
  ConcurrencyError = require('../../errors/concurrencyError'),
  _ = require('lodash'),
  async = Store.use('async'),
  azure = Store.use('azure-storage'),
  eg = azure.TableUtilities.entityGenerator,
  jsondate = require('jsondate');


function AzureTable(options) {
  var azureConf = {
    storageAccount: 'nodecqrs',
    storageAccessKey: 'StXScH574p1krnkjbxjkHkMkrtbIMQpYMbH1D1uYVqS4ny/DpXVkL4ld02xeKupCQnIIN+v0KVmdLLSVA/cxTQ==',
    storageTableHost: 'https://nodecqrs.table.core.windows.net/'
  };

  this.options = _.defaults(options, azureConf);

  var defaults = {
    sagaTableName: 'saga',
    commandTableName: 'sagaCommand',
    undispatchedCommandtableName: 'sagaUndispatchedCommand'
  };

  this.options = _.defaults(this.options, defaults);
}

util.inherits(AzureTable, Store);

_.extend(AzureTable.prototype, {

  connect: function (callback) {
    var retryOperations = new azure.ExponentialRetryPolicyFilter();

    var self = this;

    this.client = azure.createTableService(this.options.storageAccount, this.options.storageAccessKey, this.options.storageTableHost).withFilter(retryOperations);

    var createSagaTable = function (callback) {
      self.client.createTableIfNotExists(self.options.sagaTableName, callback);
    };

    var createCommandTable = function (callback) {
      self.client.createTableIfNotExists(self.options.commandTableName, callback);
    };

    var createUndispatchedCommandTable = function (callback) {
      self.client.createTableIfNotExists(self.options.undispatchedCommandtableName, callback);
    };

    async.parallel([
      createSagaTable,
      createCommandTable,
      createUndispatchedCommandTable
    ], function (err) {
      if (err) {
        if (callback) callback(err);
      } else {
        self.emit('connect');
        if (callback) callback(null, self);
      }
    });
  },

  disconnect: function (callback) {
    this.emit('disconnect');
    if (callback) callback(null);
  },

  get: function (id, callback) {

    var queryOptions = {
      entityResolver: sagaResolver
    };

    if (!id || !_.isString(id)) {
      var err = new Error('Please pass a valid id!');
      debug(err);
      return callback(err);
    }

    this.client.retrieveEntity(this.options.sagaTableName,
      id,
      id,
      queryOptions,
      function (err, saga) {
        if (err && err.code != 'ResourceNotFound') {
          if (callback) return callback(err);
        }

        if (!saga) {
          return callback(null, null);
        }

        callback(null, saga);
      }
    );
  },

  remove: function (id, callback) {

    var self = this;
    var query = new azure.TableQuery();
    query.where('PartitionKey eq ?', id);

    if (!id || !_.isString(id)) {
      var err = new Error('Please pass a valid id!');
      debug(err);
      return callback(err);
    }

    var objDescriptor = {
      PartitionKey: eg.String(id),
      RowKey: eg.String(id)
    };


    var removeSaga = function (callback) {
      self.client.deleteEntity(self.options.sagaTableName, objDescriptor, function (err) {
        if (err && err.code != 'ResourceNotFound') {
          debug(err);
          return callback(err);
        }
        callback(null);
      });
    };

    var removeCommands = function (callback) {
      self.client.queryEntities(self.options.commandTableName, query, null, function (err, entities) {
          if (!err) {
            async.each(entities.entries, function (entity, callback) {
                self.client.deleteEntity(self.options.commandTableName, entity, function (error, response) {
                  callback(error);
                });
              },
              function (error) {
                callback(error);
              });
          }
        }
      );
    };

    var removeUndispatchedCommands = function (callback) {
      self.client.queryEntities(self.options.undispatchedCommandtableName, query, null, function (err, entities) {
          if (!err) {
            async.each(entities.entries, function (entity, callback) {
                self.client.deleteEntity(self.options.undispatchedCommandtableName, entity, function (error, response) {
                  callback(error);
                });
              },
              function (error) {
                callback(error);
              });
          }
        }
      );
    };

    async.parallel([
      removeSaga,
      removeCommands,
      removeUndispatchedCommands
    ], function (err) {
      callback(err);
    });
  },

  save: function (saga, cmds, callback) {

    var self = this;
    var commandBatch = new azure.TableBatch();
    var undispatchedCommandBatch = new azure.TableBatch();

    if (!saga || !_.isObject(saga) || !_.isString(saga.id) || !_.isDate(saga._commitStamp)) {
      var err = new Error('Please pass a valid saga!');
      debug(err);
      return callback(err);
    }

    if (!cmds || !_.isArray(cmds)) {
      var err = new Error('Please pass a valid saga!');
      debug(err);
      return callback(err);
    }

    if (cmds.length > 0) {
      for (var c in cmds) {
        var cmd = cmds[c];
        if (!cmd.id || !_.isString(cmd.id) || !cmd.payload) {
          var err = new Error('Please pass a valid commands array!');
          debug(err);
          return callback(err);
        }

        var entity = {
          PartitionKey: eg.String(saga.id),
          RowKey: eg.String(cmd.id),
          payload: eg.String(JSON.stringify(cmd)),
          commitStamp: eg.DateTime(saga._commitStamp)
        };

        commandBatch.insertOrReplaceEntity(entity);
        undispatchedCommandBatch.insertOrReplaceEntity(entity);
      }
    }

    async.parallel([
      function (callback) {
        if (!saga._etag) {
          self.client.insertEntity(self.options.sagaTableName,
            {
              PartitionKey: eg.String(saga.id),
              RowKey: eg.String(saga.id),
              commitStamp: eg.DateTime(saga._commitStamp),
              timeoutAt: eg.DateTime(saga._timeoutAt),
              payload: eg.String(JSON.stringify(saga))
            }, function (err) {
              if (err && err.code == 'EntityAlreadyExists')
                return callback(new ConcurrencyError());

              callback(err);
            });
        } else {
          var etag = saga._etag;
          delete saga._etag;
          self.client.updateEntity(self.options.sagaTableName,
            {
              '.metadata': {
                etag: etag
              },
              PartitionKey: eg.String(saga.id),
              RowKey: eg.String(saga.id),
              commitStamp: eg.DateTime(saga._commitStamp),
              timeoutAt: eg.DateTime(saga._timeoutAt),
              payload: eg.String(JSON.stringify(saga))
            }, function (err) {
              if (err && err.code == 'UpdateConditionNotSatisfied' && err.statusCode == 412)
                return callback(new ConcurrencyError());

              callback(err);
            });
        }
      },
      function (callback) {
        if (commandBatch.size() > 0) {
          self.client.executeBatch(self.options.commandTableName, commandBatch, function (err) {
            if (err && err.code == 'EntityAlreadyExists')
              return callback(new ConcurrencyError());

            callback(err);
          });
        } else {
          callback();
        }
      },
      function (callback) {
        if (undispatchedCommandBatch.size() > 0) {
          self.client.executeBatch(self.options.undispatchedCommandtableName, undispatchedCommandBatch, function (err) {
            if (err && err.code == 'EntityAlreadyExists')
              return callback(new ConcurrencyError());

            callback(err);
          });
        } else {
          callback();
        }
      }
    ], function (err) {
      callback(err);
    });

  },

  getTimeoutedSagas: function (options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }
    var entities = [];
    var self = this;
    var continuationToken = null;

    var queryOptions = {
      entityResolver: sagaResolver
    };

    var tableQuery = new azure.TableQuery();
    tableQuery.where('timeoutAt <= ?', new Date());

    async.doWhilst(function (end) {
      // retrieve entities
      self.client.queryEntities(self.options.sagaTableName, tableQuery, continuationToken, queryOptions, function (err, results) {
        if (err) {
          debug(err);
          return end(err);
        }
        continuationToken = results.continuationToken;
        entities = entities.concat(results.entries);
        end(null);
      });
    }, function () {
      // test if we need to load more
      return continuationToken !== null;
    }, function (err) {
      // return results
      if (err) {
        debug(err);
        return callback(err);
      }

      return callback(null, entities);
    });

  },

  getOlderSagas: function (date, callback) {

    var queryOptions = {
      entityResolver: sagaResolver
    };

    if (!date || !_.isDate(date)) {
      var err = new Error('Please pass a valid date object!');
      debug(err);
      return callback(err);
    }

    var entities = [];
    var self = this;
    var continuationToken = null;

    var tableQuery = new azure.TableQuery();
    tableQuery.where('commitStamp <= ?', date);

    async.doWhilst(function (end) {
      // retrieve entities
      self.client.queryEntities(self.options.sagaTableName, tableQuery, continuationToken, queryOptions, function (err, results) {
        if (err) {
          debug(err);
          return end(err);
        }
        continuationToken = results.continuationToken;
        entities = entities.concat(results.entries);
        end(null);
      });
    }, function () {
      // test if we need to load more
      return continuationToken !== null;
    }, function (err) {
      // return results
      if (err) {
        debug(err);
        return callback(err);
      }

      return callback(null, entities);
    });

  },

  getUndispatchedCommands: function (options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    }
    var entities = [];
    var self = this;
    var continuationToken = null;

    var tableQuery = new azure.TableQuery();

    async.doWhilst(function (end) {
      // retrieve entities
      self.client.queryEntities(self.options.undispatchedCommandtableName, tableQuery, continuationToken, function (err, results) {
        if (err) {
          debug(err);
          return end(err);
        }
        continuationToken = results.continuationToken;
        entities = entities.concat(results.entries);
        end(null);
      });
    }, function () {
      // test if we need to load more
      return continuationToken !== null;
    }, function (err) {
      // return results
      if (err) {
        debug(err);
        return callback(err);
      }

      entities = entities.map(function (entity) {
        var data = jsondate.parse(entity.payload._);

        return {sagaId: entity.PartitionKey._, commandId: entity.RowKey._, command: data.payload, commitStamp: entity.commitStamp._};
      });

      return callback(null, entities);
    });

  },

  setCommandToDispatched: function (cmdId, sagaId, callback) {
    var self = this;

    if (!cmdId || !_.isString(cmdId)) {
      var err = new Error('Please pass a valid command id!');
      debug(err);
      return callback(err);
    }

    if (!sagaId || !_.isString(sagaId)) {
      var err = new Error('Please pass a valid saga id!');
      debug(err);
      return callback(err);
    }

    var objDescriptor = {
      PartitionKey: eg.String(sagaId),
      RowKey: eg.String(cmdId)
    };

    self.client.deleteEntity(self.options.undispatchedCommandtableName, objDescriptor, null,
      function (err) {
        if (err && err.code != 'ResourceNotFound') {
          debug(err);
          return callback(err);
        }
        callback(null);
      });

  },

  clear: function (callback) {

    var self = this;
    var query = new azure.TableQuery();

    var clearSagaTable = function (callback) {
      self.client.queryEntities(self.options.sagaTableName, query, null, function (err, entities) {
          if (!err) {
            async.each(entities.entries, function (entity, callback) {
                self.client.deleteEntity(self.options.sagaTableName, entity, function (error, response) {
                  callback(error);
                });
              },
              function (error) {
                callback(error);
              });
          }
        }
      );
    };

    var clearCommandTable = function (callback) {
      self.client.queryEntities(self.options.commandTableName, query, null, function (err, entities) {
          if (!err) {
            async.each(entities.entries, function (entity, callback) {
                self.client.deleteEntity(self.options.commandTableName, entity, function (error, response) {
                  callback(error);
                });
              },
              function (error) {
                callback(error);
              });
          }
        }
      );
    };

    var clearUndispatchedCommandTable = function (callback) {
      self.client.queryEntities(self.options.undispatchedCommandtableName, query, null, function (err, entities) {
          if (!err) {
            async.each(entities.entries, function (entity, callback) {
                self.client.deleteEntity(self.options.undispatchedCommandtableName, entity, function (error, response) {
                  callback(error);
                });
              },
              function (error) {
                callback(error);
              });
          }
        }
      );
    }

    async.parallel([
      clearSagaTable,
      clearCommandTable,
      clearUndispatchedCommandTable
    ], callback);
  }
});

function sagaResolver(entity) {
  var res = jsondate.parse(entity.payload._);
  res._etag = entity['.metadata']['etag'];
  return res;
}


module.exports = AzureTable;
