// if exports is an array, it will be the same like loading multiple files...
module.exports = require('cqrs-saga').defineSagaStep({// event to match...
  'name': 'paymentAccepted',
  'aggregate': 'payment',
  'context': 'sale',
  'version': 2 // default is 0
}, { // optional settings
  containingProperties: ['payload.transactionId'],
  id: 'payload.transactionId'
  // payload: 'payload' // if not defined it will pass the whole event...
}, function (evt, saga, callback) {

  var cmd = {
    // id: 'my own command id', // if you don't pass an id it will generate one, when emitting the command...
    name: 'confirmOrder',
    aggregate: {
      name: 'order',
      id: saga.get('orderId')
    },
    context: {
      name: 'sale'
    },
    payload: {
      transactionId: saga.id
    },
    meta: evt.meta // to transport userId...   if not defined in cmd, it will defaultly use it from event
  };

  saga.defineCommandToSend(cmd);

  saga.commit(callback);
});
