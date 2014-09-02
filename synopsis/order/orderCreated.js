// if exports is an array, it will be the same like loading multiple files...
module.exports = require('cqrs-saga').defineSagaStart({// event to match...
  name: 'orderCreated',
  aggregate: 'order',
  context: 'sale'
  // payload: 'payload' // if not defined it will pass the whole event...
  // id: 'aggregate.id' // if not defined it will generate an id
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
    },
    meta: evt.meta // to transport userId...   if not defined in cmd, it will defaultly use it from event
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
    },
    meta: evt.meta // to transport userId...   if not defined in cmd, it will defaultly use it from event
  };
  saga.defineTimeout(tomorrow, [timeoutCmd]); // pass in array of commands or a command object

  saga.commit(callback);
});
