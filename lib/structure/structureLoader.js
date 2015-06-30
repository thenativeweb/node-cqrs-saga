'use strict';

var debug = require('debug')('saga:structureLoader'),
  path = require('path'),
  _ = require('lodash'),
  structureParser = require('./structureParser'),
  Saga = require('./../definitions/saga');

function isSaga (item) {
  if (item.fileType !== 'js') {
    return false;
  }

  return item.value instanceof Saga;
}

function defineName (item) {
  var name = item.value.name;

  function defineNameByDir () {
    if (!name) {
      var splits = item.dottiedBase.split('.');
      name = splits[splits.length - 1];
    }
  }

  function defineNameByFileName () {
    if (!name) {
      name = item.fileName.substring(0, item.fileName.lastIndexOf('.'));
    }
  }

  defineNameByFileName();
  defineNameByDir();

  item.name = name;
}

function scan (items) {
  var res = [];

  items.forEach(function (item) {
    if (isSaga(item)) {
      debug('found saga at: ' + item.path);
      defineName(item);
      item.value.name = item.name;
      res.push(item.value);
      res = _.sortBy(res, function(s) {
        return s.priority;
      });
    }
  });

  return res;
}

function analyze (dir, callback) {
  structureParser(dir, function (items) {
    return _.filter(items, function (i) {
      return isSaga(i);
    });
  }, function (err, items, warns) {
    if (err) {
      return callback(err);
    }

    var res = scan(items);

    callback(null, res, warns);
  });
}

function load (dir, callback) {
  analyze(dir, function (err, sagas, warns) {
    if (err) {
      return callback(err);
    }

    callback(err, sagas, warns);
  });
}

module.exports = load;
