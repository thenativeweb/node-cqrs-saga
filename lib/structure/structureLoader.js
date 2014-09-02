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

  defineNameByFileName();
  defineNameByDir();

  item.name = name;
}

function scan (items) {
  var res = [];

  items.forEach(function (item) {
    if (isSaga(item)) {
      debug('found sagaStart at: ' + item.path);
      defineName(item);
      res.push(item);
      res = _.sortBy(res, function(s) {
        return s.priority;
      });
    }
  });

  return res;
}

function analyze (dir, callback) {
  structureParser(dir, function (err, items) {
    if (err) {
      return callback(err);
    }

    var res = scan(items);

    callback(null, res);
  });
}

function load (dir, callback) {
  analyze(dir, function (err, sagas) {
    if (err) {
      return callback(err);
    }

    callback(err, sagas)
  })
}

module.exports = load;
