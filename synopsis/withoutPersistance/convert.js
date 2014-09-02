// if exports is an array, it will be the same like loading multiple files...
module.exports = require('cqrs-saga').defineSagaStart({// event to match...
  name: 'openDoorRequested',
  aggregate: 'door',
  context: 'access'
  // payload: 'payload' // if not defined it will pass the whole event...
  // id: 'aggregate.id' // if not defined it will generate an id
  // priority: 1 // optional, default Infinity, all sagas will be sorted by this value
}, function (evt, callback) {

  var cmd = {
    // id: 'my own command id', // if you don't pass an id it will generate one, when emitting the command...
    name: 'openDoor',
    aggregate: {
      name: 'request'
    },
    context: {
      name: 'controller'
    },
    payload: {
    },
    meta: evt.meta // to transport userId...   if not defined in cmd, it will defaultly use it from event
  };

  callback(null, [cmd]);
  // or
  // callback(null, cmd);
});
