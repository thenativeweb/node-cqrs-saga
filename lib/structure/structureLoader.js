'use strict';

var debug = require('debug')('saga:structureLoader'),
  path = require('path'),
  _ = require('lodash'),
  structureParser = require('./structureParser'),
  SagaStart = require('./../definitions/sagaStart'),
  SagaStep = require('./../definitions/sagaStep');

function isSagaStart (item) {
  if (item.fileType !== 'js') {
    return false;
  }

  return item.value instanceof SagaStart;
}

function isSagaStep (item) {
  if (item.fileType !== 'js') {
    return false;
  }

  return item.value instanceof SagaStep;
}

function defineName (item) {
  var name = item.value.name;

  defineNameByFileName();
  defineNameByDir();

  item.name = name;
}

function scan (items) {
  var res = {
    sagaStarts: [],
    sagaSteps: []
  };

  items.forEach(function (item) {
    if (isSagaStart(item)) {
      debug('found sagaStart at: ' + item.path);
      defineName(item);
      res.sagaStarts.push(item);
      res.sagaStarts = _.sortBy(res.sagaStarts, function(s) {
        return s.priority;
      });
      return;
    }

    if (isSagaStep(item)) {
      debug('found sagaStep at: ' + item.path);
      defineName(item);
      res.sagaSteps.push(item);
      res.sagaSteps = _.sortBy(res.sagaSteps, function(s) {
        return s.priority;
      });
      return;
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
  analyze(dir, function (err, dividedByTypes) {
    if (err) {
      return callback(err);
    }

    callback(err, dividedByTypes)
  })
}

module.exports = load;
