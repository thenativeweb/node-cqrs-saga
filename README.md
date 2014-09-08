# Introduction

[![travis](https://img.shields.io/travis/adrai/node-cqrs-saga.svg)](https://travis-ci.org/adrai/node-cqrs-saga) [![npm](https://img.shields.io/npm/v/cqrs-saga.svg)](https://npmjs.org/package/cqrs-saga)

Node-cqrs-saga is a node.js module that helps to implement the sagas in cqrs.
It can be very useful as domain component if you work with (d)ddd, cqrs, eventdenormalizer, host, etc.

# Installation

    $ npm install cqrs-saga


# Usage

	var pm = require('cqrs-saga')({
	  // the path to the "working directory"
	  // can be structured like
	  // [set 1](https://github.com/adrai/node-cqrs-saga/tree/master/test/integration/fixture)
	  sagaPath: '/path/to/my/files',
	  
	  // optional, default is 800
	  // if using in scaled systems and not guaranteeing that each event for a saga "instance"
	  // dispatches to the same worker process, this module tries to catch the concurrency issues and
	  // retries to handle the event after a timeout between 0 and the defined value
	  retryOnConcurrencyTimeout: 1000,
	  
	  // optional, default is in-memory
	  // currently supports: mongodb, redis and inmemory
	  // hint settings like: [eventstore](https://github.com/adrai/node-eventstore#provide-implementation-for-storage)
	  // mongodb:
	  sagaStore: {
	    type: 'mongodb',
	    host: 'localhost',                          // optional
	    port: 27017,                                // optional
	    dbName: 'domain',                           // optional
	    collectionName: 'sagas',                    // optional
	    timeout: 10000                              // optional
	    // username: 'technicalDbUser',                // optional
	    // password: 'secret'                          // optional
	  },
	  // or redis:
	  sagaStore: {
	    type: 'redis',
	    host: 'localhost',                          // optional
	    port: 6379,                                 // optional
	    db: 0,                                      // optional
	    prefix: 'domain_saga',                      // optional
	    timeout: 10000                              // optional
	    // password: 'secret'                          // optional
	  }
	});


## Catch connect ad disconnect events

	// sagaStore
	pm.sagaStore.on('connect', function() {
	  console.log('sagaStore connected');
	});
	
	pm.sagaStore.on('disconnect', function() {
	  console.log('sagaStore disconnected');
	});
	
	
	// anything (at the moment only sagaStore)
	pm.on('connect', function() {
	  console.log('something connected');
	});
	
	pm.on('disconnect', function() {
	  console.log('something disconnected');
	});


## Define the event structure
The values describes the path to that property in the event message.

	pm.defineEvent({
	  // optional, default is 'name'
	  name: 'name',
	  
	  // optional, only makes sense if contexts are defined in the 'domainPath' structure 
	  context: 'context.name',
	  
	  // optional, only makes sense if aggregates with names are defined in the 'domainPath' structure
	  aggregate: 'aggregate.name',
	  
	  // optional
	  version: 'version',
	  
	  // optional, if defined theses values will be copied to the command (can be used to transport information like userId, etc..)
	  meta: 'meta'
	});


## Define the command structure
The values describes the path to that property in the command message.

	pm.defineCommand({
	  // optional, default is 'id'
	  id: 'id',
	  
	  // optional, if defined the values of the event will be copied to the command (can be used to transport information like userId, etc..)
	  meta: 'meta'
	});


## Define the id generator function [optional]
### you can define a synchronous function

	pm.idGenerator(function () {
	  var id = require('node-uuid').v4().toString();
	  return id;
	});

### or you can define an asynchronous function

	pm.idGenerator(function (callback) {
	  setTimeout(function () {
	    var id = require('node-uuid').v4().toString();
	    callback(null, id);
	  }, 50);
	});


## Wire up commands [optional]
### you can define a synchronous function

	// pass commands to bus
	pm.onCommand(function (cmd) {
	  bus.emit('command', cmd);
	});
	
### or you can define an asynchronous function

	// pass commands to bus
	pm.onCommand(function (cmd, callback) {
	  bus.emit('command', cmd, function ack () {
	    callback();
	  });
	});


## Initialization
	
	pm.init(function (err) {
	  // this callback is called when all is ready...
	});
	
	// or
	
	pm.init(); // callback is optional


## Handling an event

	pm.handle({
	  id: 'b80ade36-dd05-4340-8a8b-846eea6e286f',
	  name: 'orderCreated',
	  aggregate: {
	    id: '3b4d44b0-34fb-4ceb-b212-68fe7a7c2f70',
	    name: 'order'
	  },
	  context: {
	    name: 'sale'
	  },
	  payload: {
      totalCosts: 520,
      seats: ['4f', '8a']
	  },
	  revision: 0,
	  version: 1,
	  meta: {
	    userId: 'ccd65819-4da4-4df9-9f24-5b10bf89ef89'
	  }
	}); // callback is optional
	
### or
	
	pm.handle({
	  id: 'b80ade36-dd05-4340-8a8b-846eea6e286f',
	  name: 'orderCreated',
    aggregate: {
      id: '3b4d44b0-34fb-4ceb-b212-68fe7a7c2f70',
      name: 'order'
    },
    context: {
      name: 'sale'
    },
    payload: {
      totalCosts: 520,
      seats: ['4f', '8a']
    },
	  revision: 0,
	  version: 1,
	  meta: {
	    userId: 'ccd65819-4da4-4df9-9f24-5b10bf89ef89'
	  }
	}, function (errs, cmds) {
	  // this callback is called when event is handled successfully or unsuccessfully
	  // errs can be of type:
	  // - null
	  // - Array of Errors
	  //
	  // cmds: same as passed in 'onCommand' function
	});
	
### more infos, can be useful if testing
	
	pm.handle({
	  id: 'b80ade36-dd05-4340-8a8b-846eea6e286f',
	  name: 'orderCreated',
    aggregate: {
      id: '3b4d44b0-34fb-4ceb-b212-68fe7a7c2f70',
      name: 'order'
    },
    context: {
      name: 'sale'
    },
    payload: {
      totalCosts: 520,
      seats: ['4f', '8a']
    },
	  meta: {
	    userId: 'ccd65819-4da4-4df9-9f24-5b10bf89ef89'
	  }
	}, function (errs, cmds, sagaModels) {
	  // this callback is called when event is handled successfully or unsuccessfully
	  // errs: is the same as described before
	  
	  // cmds: same as passed in 'onCommand' function
	  // cmds: in case of no error or in case of error here is the array of all commands that should be published
	  
	  // sagaModels: represents the saga data after have handled the event
	});




[Release notes](https://github.com/adrai/node-cqrs-saga/blob/master/releasenotes.md)

# License

Copyright (c) 2014 Adriano Raiano

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
