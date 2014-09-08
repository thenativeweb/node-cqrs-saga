var expect = require('expect.js'),
  api = require('../../index');

describe('integration', function () {

  var pm;

  before(function (done) {
    pm = api({ sagaPath: __dirname + '/fixture' });
    pm.defineCommand({
      id: 'id',
      meta: 'meta'
    });
    pm.defineEvent({
      name: 'name',
      context: 'context.name',
      aggregate: 'aggregate.name',
      version: 'version',
      meta: 'meta'
    });

    pm.init(done);
  });

  describe('handling an event that will not be handled', function () {

    it('it should not publish any command and it should callback without an error and without commands', function (done) {

      var publishedCommands = [];

      pm.onCommand(function (cmd) {
        publishedCommands.push(cmd);
      });

      var evt = {
        name: 'evtName',
        aggregate: {
          name: 'aggregate'
        },
        context: {
          name: 'context'
        },
        version: 0,
        meta: {
          userId: 'userId'
        }
      };

      pm.handle(evt, function (err, cmds, sagaModels) {
        expect(err).not.to.be.ok();
        expect(cmds).to.be.an('array');
        expect(cmds.length).to.eql(0);
        expect(sagaModels).to.be.an('array');
        expect(sagaModels.length).to.eql(0);
        expect(publishedCommands.length).to.eql(0);

        done();
      });

    });

  });

  describe('handling an event that will be handled but will use only an already existing saga', function () {

    it('it should not publish any command and it should callback without an error and without commands', function (done) {

      var publishedCommands = [];

      pm.onCommand(function (cmd) {
        publishedCommands.push(cmd);
      });

      var evt = {
        name: 'paymentAccepted',
        aggregate: {
          name: 'payment'
        },
        context: {
          name: 'sale'
        },
        version: 2,
        payload: {
          transactionId: 'not_existing_64412467'
        },
        meta: {
          userId: 'userId'
        }
      };

      pm.handle(evt, function (err, cmds, sagaModels) {
        expect(err).not.to.be.ok();
        expect(cmds).to.be.an('array');
        expect(cmds.length).to.eql(0);
        expect(sagaModels).to.be.an('array');
        expect(sagaModels.length).to.eql(0);
        expect(publishedCommands.length).to.eql(0);

        done();
      });

    });

  });

  describe('handling an event that will start a new saga', function () {
    
    var transactionId;

    it('it should publish a command and it should callback without an error and with commands', function (done) {

      var publishedCommands = [];

      pm.onCommand(function (cmd) {
        publishedCommands.push(cmd);
      });

      var evt = {
        name: 'orderCreated',
        aggregate: {
          name: 'order',
          id: 'aggId'
        },
        context: {
          name: 'sale'
        },
        version: 0,
        payload: {
          totalCosts: 520,
          seats: ['4f', '8a']
        },
        meta: {
          userId: 'userId'
        }
      };

      pm.handle(evt, function (err, cmds, sagaModels) {
        expect(err).not.to.be.ok();
        expect(cmds).to.be.an('array');
        expect(cmds.length).to.eql(1);
        expect(cmds[0].id).to.be.a('string');
        expect(cmds[0].name).to.eql('makeReservation');
        expect(cmds[0].payload.seats).to.eql(evt.payload.seats);
        expect(cmds[0].payload.transactionId).to.be.a('string');

        transactionId = cmds[0].payload.transactionId;
        
        expect(cmds[0].meta).to.eql(evt.meta);
        expect(sagaModels).to.be.an('array');
        expect(sagaModels.length).to.eql(1);
        expect(sagaModels[0].getTimeoutAt()).to.be.a(Date);
        expect(sagaModels[0].getTimeoutCommands()).to.be.an('array');
        expect(sagaModels[0].getTimeoutCommands().length).to.eql(1);
        expect(sagaModels[0].getTimeoutCommands()[0].id).to.be.a('string');
        expect(sagaModels[0].getTimeoutCommands()[0].name).to.eql('cancelOrder');
        expect(sagaModels[0].getTimeoutCommands()[0].payload.transactionId).to.eql(cmds[0].payload.transactionId);
        expect(sagaModels[0].getTimeoutCommands()[0].meta).to.eql(evt.meta);
        expect(publishedCommands.length).to.eql(1);
        expect(publishedCommands[0].id).to.be.a('string');
        expect(publishedCommands[0].name).to.eql('makeReservation');
        expect(publishedCommands[0].payload.seats).to.eql(evt.payload.seats);
        expect(publishedCommands[0].payload.transactionId).to.be.a('string');
        expect(publishedCommands[0].meta).to.eql(evt.meta);

        done();
      });

    });

    describe('continue with the next step', function () {

      it('it should publish a command and it should callback without an error and with commands', function (done) {

        var publishedCommands = [];

        pm.onCommand(function (cmd) {
          publishedCommands.push(cmd);
        });

        var evt = {
          name: 'seatsReserved',
          aggregate: {
            name: 'reservation',
            id: 'aggId'
          },
          context: {
            name: 'sale'
          },
          version: 0,
          payload: {
            transactionId: transactionId
          },
          meta: {
            userId: 'userId'
          }
        };

        pm.handle(evt, function (err, cmds, sagaModels) {
          expect(err).not.to.be.ok();
          expect(cmds).to.be.an('array');
          expect(cmds.length).to.eql(1);
          expect(cmds[0].id).to.be.a('string');
          expect(cmds[0].name).to.eql('makePayment');
          expect(cmds[0].payload.transactionId).to.be.a('string');
          expect(cmds[0].meta).to.eql(evt.meta);
          expect(sagaModels).to.be.an('array');
          expect(sagaModels.length).to.eql(1);
          expect(sagaModels[0].getTimeoutAt()).to.be.a(Date);
          expect(sagaModels[0].getTimeoutCommands()).to.be.an('array');
          expect(sagaModels[0].getTimeoutCommands().length).to.eql(1);
          expect(sagaModels[0].getTimeoutCommands()[0].id).to.be.a('string');
          expect(sagaModels[0].getTimeoutCommands()[0].name).to.eql('cancelOrder');
          expect(sagaModels[0].getTimeoutCommands()[0].payload.transactionId).to.eql(cmds[0].payload.transactionId);
          expect(sagaModels[0].getTimeoutCommands()[0].meta).to.eql(evt.meta);
          expect(publishedCommands.length).to.eql(1);
          expect(publishedCommands[0].id).to.be.a('string');
          expect(publishedCommands[0].name).to.eql('makePayment');
          expect(publishedCommands[0].payload.costs).to.eql(520);
          expect(publishedCommands[0].payload.transactionId).to.be.a('string');
          expect(publishedCommands[0].meta).to.eql(evt.meta);

          done();
        });

      });

    });

  });

});
