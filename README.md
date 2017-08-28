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
	  // currently supports: mongodb, redis, azuretable and inmemory
	  // hint settings like: [eventstore](https://github.com/adrai/node-eventstore#provide-implementation-for-storage)
	  // mongodb:
	  sagaStore: {
	    type: 'mongodb',
	    host: 'localhost',                          // optional
	    port: 27017,                                // optional
	    dbName: 'domain',                           // optional
	    collectionName: 'sagas',                    // optional
	    timeout: 10000                              // optional
      // authSource: 'authedicationDatabase',        // optional
	    // username: 'technicalDbUser',                // optional
	    // password: 'secret'                          // optional
      // url: 'mongodb://user:pass@host:port/db?opts // optional
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
	  },

	  // optional, default is in-memory
	  // the revisionguard only works if aggregateId and revision are defined in event definition
	  // currently supports: mongodb, redis, tingodb, azuretable and inmemory
	  // hint settings like: [eventstore](https://github.com/adrai/node-eventstore#provide-implementation-for-storage)
	  revisionGuard: {
	  	queueTimeout: 1000,                         // optional, timeout for non-handled events in the internal in-memory queue
	  	queueTimeoutMaxLoops: 3,                    // optional, maximal loop count for non-handled event in the internal in-memory queue
      startRevisionNumber: 1,			                // optional, if defined the denormaizer waits for an event with that revision to be used as first event

	  	type: 'redis',
	  	host: 'localhost',                          // optional
	  	port: 6379,                                 // optional
	  	db: 0,                                      // optional
	  	prefix: 'readmodel_revision',               // optional
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

	// revisionGuardStore
	pm.revisionGuardStore.on('connect', function() {
	  console.log('revisionGuardStore connected');
	});

	pm.revisionGuardStore.on('disconnect', function() {
	  console.log('revisionGuardStore disconnected');
	});


	// anything (sagaStore or revisionGuardStore)
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

	  // optional, default is 'aggregate.id'
	  aggregateId: 'aggregate.id',

	  // optional, default is 'revision'
	  // will represent the aggregate revision, can be used in next command
	  revision: 'revision',

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
	  var id = require('uuid').v4().toString();
	  return id;
	});

### or you can define an asynchronous function

	pm.idGenerator(function (callback) {
	  setTimeout(function () {
	    var id = require('uuid').v4().toString();
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


## Wire up event missing [optional]

	pm.onEventMissing(function (info, evt) {

		// grab the missing events, depending from info values...
		// info.aggregateId
		// info.aggregateRevision
		// info.aggregate
		// info.context
		// info.guardRevision
		// and call handle...
		pm.handle(missingEvent, function (err) {
			if (err) { console.log(err); }
		});

	});

you can get the last guarded event:

	pm.getLastEvent(function (err, evt) {

	  if (event.occurredAt < Date.now()) {
	  	// ...
	  }

	});


## Initialization

	pm.init(function (err, warnings) {
	  // this callback is called when all is ready...
	  // warnings: if no warnings warnings is null, else it's an array containing errors during require of files
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


## Request saga information

After the initialization you can request the saga information:

	pm.init(function (err) {
	  pm.getInfo();
	  // ==>
	  // {
	  //   "sagas": [
	  //     {
	  //       "name": "orderConfirmed",
	  //       "aggregate": "order",
	  //       "context": "sale",
	  //       "version": 0
	  //     },
	  //     {
	  //       "name": "orderCreated",
	  //       "aggregate": "order",
	  //       "context": "sale",
	  //       "version": 0
	  //     },
	  //     {
	  //       "name": "paymentAccepted",
	  //       "aggregate": "payment",
	  //       "context": "sale",
	  //       "version": 2
	  //     },
	  //     {
	  //       "name": "seatsReserved",
	  //       "aggregate": "reservation",
	  //       "context": "sale",
	  //       "version": 0
	  //     }
	  //   ]
	  // }
	});


# Components definition

## Saga

	module.exports = require('cqrs-saga').defineSaga({
	  // optional, default is file name without extension
	  name: 'orderCreated',

	  // optional
	  aggregate: 'order',

	  // optional
	  context: 'sale',

	  // optional, default 0
	  version: 1,

	  // optional, default false
	  // if true it will check if there is already a saga in the db and only if there is something it will continue...
	  existing: false,

	  // optional, will catch the event only if it contains the defined properties
	  containingProperties: ['aggregate.id', 'payload.totalCosts', 'payload.seats'],

	  // optional, if not defined it will pass the whole event...
	  payload: 'payload',

	  // optional, if not defined it will generate a new id
	  // it will try to load the saga from the db by this id
	  id: 'aggregate.id',

	  // optional, default Infinity, all sagas will be sorted by this value
	  priority: 1
	}, function (evt, saga, callback) {

	  // if you have multiple concurrent events that targets the same saga, you can catch it like this:
	  if (saga.actionOnCommit === 'create') {
	  	return this.retry();
	  	// or
	  	//return this.retry(100); // retries to handle again in 0-100ms
	  	// or
	  	//return this.retry({ from: 500, to: 8000 }); // retries to handle again in 500-8000ms
	  }

	  saga.set('orderId', evt.aggregate.id);
	  saga.set('totalCosts', evt.payload.totalCosts);
	  // or
	  // saga.set({ orderId: evt.aggregate.id, totalCosts: evt.payload.totalCosts });

	  var cmd = {

	    // if you don't pass an id it will generate a new one
	    id: 'my own command id',
	    name: 'makeReservation',
	    aggregate: {
	      name: 'reservation'
	    },
	    context: {
	      name: 'sale'
	    },
	    payload: {
	      transactionId: saga.id,
	      seats: saga.has('seats') ? saga.get('seats') : evt.payload.seats
	    },

	    // to transport meta infos (like userId)...
	    // if not defined, it will use the meta value of the event
	    meta: evt.meta
	  };

	  saga.addCommandToSend(cmd);

	  // optionally define a timeout
	  // this can be useful if you have an other process that will fetch timeouted sagas
	  var tomorrow = new Date();
	  tomorrow.setDate((new Date()).getDate() + 1);
	  var timeoutCmd = {

	    // if you don't pass an id it will generate a new one
	    id: 'my own command id',
	    name: 'cancelOrder',
	    aggregate: {
	      name: 'order',
	      id: evt.aggregate.id
	    },
	    context: {
	      name: 'sale'
	    },
	    payload: {
	      transactionId: saga.id
	    },

	    // to transport meta infos (like userId)...
	    // if not defined, it will use the meta value of the event
	    meta: evt.meta
	  };
	  saga.defineTimeout(tomorrow, [timeoutCmd]);
	  // or
	  // saga.defineTimeout(tomorrow, timeoutCmd);
	  // or
	  // saga.defineTimeout(tomorrow);

	  saga.commit(callback);
	});
	// optional define a function to that returns an id that will be used as saga id
	//.useAsId(function (evt) {
	//  return 'newId';
	//});
	// or
	//.useAsId(function (evt, callback) {
	//  callback(null, 'newId');
	//});
	//
	// optional define a function that checks if an event should be handled
	//.defineShouldHandle(function (evt, saga) {
	//  return true;
	//});
	// or
	//.defineShouldHandle(function (evt, saga, callback) {
	//  callback(null, true');
	//});


# Persistence functions

## getTimoutedSagas
Use this function to get all timeouted sagas.

	pm.getTimeoutedSagas(function (err, sagas) {
	  if (err) { return console.log('ohh!'); }

	  sagas.forEach(function (saga) {
	    // saga.id...
	    // saga.getTimeoutAt();
	    var cmds = saga.getTimeoutCommands();

	    cmds.forEach(function (cmd) {
	    	saga.addCommandToSend(cmd);
	    });

	    saga.commit(function (err) {
        // if you have registered the pm.onCommand handler it will be automatically executed,
        // if you have not registered the pm.onCommand handler you need to publish and set the command to dispatched on your own!
	    	cmds.forEach(function (cmd) {
	    		// publish cmd...
	    		// msgBus.send(cmd);
	    		// ... and set to dispatched...
	    		pm.setCommandToDispatched(cmd.id, saga.id, function (err) {});
	    	});
	    });

	    // or if saga does not clean itself after timouted and/or no commands are defined, then:
	    // pm.removeSaga(saga || saga.id, function (err) {});
	    // or
	    // saga.destroy();
	    // saga.commit(function (err) {});
	  });
	});

## getOlderSagas
Use this function to get all sagas that are older then the passed date.

	pm.getOlderSagas(new Date(2010, 2, 4), function (err, sagas) {
	  if (err) { return console.log('ohh!'); }

	  sagas.forEach(function (saga) {
	    // saga.id...
	    // saga.getTimeoutAt();
	    // saga.getTimeoutCommands();

	    // if saga does not clean itself after timouted and/or no commands are defined, then:
	    pm.removeSaga(saga || saga.id, function (err) {});
	    // or
	    // saga.destroy();
	    // saga.commit(function (err) {});
	  });
	});

## getUndispatchedCommands | setCommandToDispatched
Use getUndispatchedCommands to get all undispatched commands.

Use setCommandToDispatched to mark a command as dispatched. (will remove it from the db)

	pm.getUndispatchedCommands(function (err, cmds) {
	  if (err) { return console.log('ohh!'); }

	  cmds.forEach(function (cmd) {
	    // cmd is: { sagaId: 'the id of the saga', commandId: 'the id of the command', commitStamp: 'a date', command: { /* the command */ } }

	    pm.setCommandToDispatched(cmd.commandId, cmd.sagaId, function (err) {});
	  });
	});


## ES6 default exports
Importing ES6 style default exports is supported for all definitions where you also use `module.exports`:
```
module.exports = defineSaga({...});
```
works as well as 
```
exports.default = defineSaga({...});
```
as well as (must be transpiled by babel or tsc to be runnable in node)
```
export default defineSaga({...});
```
Exports other than the default export are then ignored by this package's structure loader.

[Release notes](https://github.com/adrai/node-cqrs-saga/blob/master/releasenotes.md)

# License

Copyright (c) 2015 Adriano Raiano

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
