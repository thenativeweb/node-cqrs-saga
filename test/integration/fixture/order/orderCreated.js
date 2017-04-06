// if exports is an array, it will be the same like loading multiple files...
//module.exports = require('cqrs-saga').defineSaga({// event to match..
module.exports = require('../../../../').defineSaga({// event to match...
//  name: 'orderCreated', // optional, default is file name without extension
  aggregate: 'order',
  context: 'sale',
  existing: false, // if true it will check if there is already a saga in the db and only if there is something it will continue...
  containingProperties: ['aggregate.id', 'payload.totalCosts', 'payload.seats'],
  // payload: 'payload' // if not defined it will pass the whole event...
  // id: 'aggregate.id' // if not defined it will generate an id
  priority: 2 // optional, default Infinity, all sagas will be sorted by this value
}, function (evt, saga, callback) {

  // saga.id or saga.get('id') is a generated id...

  saga.set('orderId', evt.aggregate.id);
  saga.set('totalCosts', evt.payload.totalCosts);

  var cmd = {
    // id: 'my own command id', // if you don't pass an id it will generate one, when emitting the command...
    name: 'makeReservation',
    aggregate: {
      name: 'reservation'
    },
    context: {
      name: 'sale'
    },
    payload: {
      transactionId: saga.id,
      seats: evt.payload.seats
    }//,
//    meta: evt.meta // to transport userId...   if not defined in cmd, it will defaultly use it from event
  };

  saga.addCommandToSend(cmd);

  // timeout stuff  (optional)
  var tomorrow = new Date();
  tomorrow.setDate((new Date()).getDate() + 1);
  var timeoutCmd = {
    // id: 'my own command id', // if you don't pass an id it will generate one, when emitting the command...
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
    }//,
//    meta: evt.meta // to transport userId...   if not defined in cmd, it will defaultly use it from event
  };
  saga.defineTimeout(tomorrow, [timeoutCmd]); // pass in array of commands or a command object

  saga.commit(callback);
});
