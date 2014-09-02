// if exports is an array, it will be the same like loading multiple files...
module.exports = require('cqrs-saga').defineSagaStep({// event to match...
  name: 'orderConfirmed',
  aggregate: 'order',
  context: 'sale',
  containingProperties: ['payload.transactionId'],
  id: 'payload.transactionId'
  // payload: 'payload' // if not defined it will pass the whole event...
  // priority: 1 // optional, default Infinity, all sagas will be sorted by this value
}, function (evt, saga, callback) {

  saga.destroy();
  saga.commit(callback);

});
