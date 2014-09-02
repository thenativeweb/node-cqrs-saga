// if exports is an array, it will be the same like loading multiple files...
module.exports = require('cqrs-saga').defineSagaStep({// event to match...
  'name': 'orderConfirmed',
  'aggregate': 'order',
  'context': 'sale'
}, { // optional settings
  containingProperties: ['payload.transactionId'],
  id: 'payload.transactionId'
  // payload: 'payload' // if not defined it will pass the whole event...
}, function (evt, saga, callback) {

  saga.destroy();
  saga.commit(callback);

});
