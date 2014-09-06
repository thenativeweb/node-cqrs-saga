// if exports is an array, it will be the same like loading multiple files...
module.exports = require('cqrs-saga').defineSaga({// event to match...
  name: 'seatsReserved',
  aggregate: 'reservation',
  context: 'sale',
  containingProperties: ['payload.transactionId'],
  id: 'payload.transactionId',
  existing: true // if true it will check if there is already a saga in the db and only if there is something it will continue...
  // payload: 'payload' // if not defined it will pass the whole event...
  // priority: 1 // optional, default Infinity, all sagas will be sorted by this value
}, function (evt, saga, callback) {

  var cmd = {
    // id: 'my own command id', // if you don't pass an id it will generate one, when emitting the command...
    name: 'makePayment',
    aggregate: {
      name: 'payment'
    },
    context: {
      name: 'sale'
    },
    payload: {
      transactionId: saga.id,
      costs: saga.get('totalCosts')
    },
    meta: evt.meta // to transport userId...   if not defined in cmd, it will defaultly use it from event
  };

  saga.addCommandToSend(cmd);

  saga.commit(callback);
});
