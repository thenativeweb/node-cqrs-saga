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
    revisionTableName: 'saga'
  };

  this.options = _.defaults(this.options, defaults);
}

util.inherits(AzureTable, Store);

_.extend(AzureTable.prototype, {

  connect: function (callback) {
    var self = this;
    var retryOperations = new azure.ExponentialRetryPolicyFilter();

    this.client = azure.createTableService(this.options.storageAccount, this.options.storageAccessKey, this.options.storageTableHost).withFilter(retryOperations);

    this.client.createTableIfNotExists(this.options.revisionTableName, function (err) {
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

    if (!id || !_.isString(id)) {
      var err = new Error('Please pass a valid id!');
      debug(err);
      return callback(err);
    }

    this.client.retrieveEntity(this.options.revisionTableName,
      id,
      id,
      function (err, revision) {
        if (err && err.code != 'ResourceNotFound') {
          if (callback) return callback(err);
        }

        if (!revision) {
          return callback(null, null);
        }

        callback(null, revision.revision._);
      }
    );
  },

  set: function (id, revision, oldRevision, callback) {

    var self = this;

    if (!id || !_.isString(id)) {
      var err = new Error('Please pass a valid id!');
      debug(err);
      return callback(err);
    }

    if (!revision || !_.isNumber(revision)) {
      var err = new Error('Please pass a valid revision!');
      debug(err);
      return callback(err);
    }

    this.client.retrieveEntity(this.options.revisionTableName,
      id,
      id,
      null,
      function (err, rev) {
        if (err && err.code != 'ResourceNotFound') {
          if (callback) return callback(err);
        }

        if (rev && rev.revision._ != oldRevision) {
          return callback(new ConcurrencyError());
        }

        self.client.insertOrReplaceEntity(self.options.revisionTableName, {
          PartitionKey: eg.String(id),
          RowKey: eg.String(id),
          revision: eg.Int64(revision)
        }, function(err){
          callback(err);
        })
      }
    );
  },

  clear: function (callback) {

    var self = this;
    var query = new azure.TableQuery();

    this.client.queryEntities(self.options.revisionTableName, query, null, function (err, entities) {
        if (!err) {
          async.each(entities.entries, function (entity, callback) {
              self.client.deleteEntity(self.options.revisionTableName, entity, function (error, response) {
                callback(error);
              });
            },
            function (error) {
              if (callback) callback(error);
            });
        }
      }
    );
  }

});

module.exports = AzureTable;
