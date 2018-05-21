var definitions = {
  Saga: require('./../definitions/saga')
};

module.exports = function (loader) {
  return function(sagaPath, callback) {
    var options = {
      sagaPath: sagaPath,
      definitions: definitions,
    };

    var tree;
    try {
      var tree = loader(options);
    } catch(e) {
      return callback(e);
    }

    return callback(null, tree);
  }
}
