'use strict';

// Grab the util module that's bundled with Node
var util = require('util');

// Create a new custom Error constructor
function AlreadyHandledError(msg) {
  // Pass the constructor to V8's
  // captureStackTrace to clean up the output
  Error.captureStackTrace(this, AlreadyHandledError);

  // If defined, store a custom error message
  if (msg) {
    this.message = msg;
  }
}

// Extend our custom Error from Error
util.inherits(AlreadyHandledError, Error);

// Give our custom error a name property. Helpful for logging the error later.
AlreadyHandledError.prototype.name = AlreadyHandledError.name;

module.exports = AlreadyHandledError;
