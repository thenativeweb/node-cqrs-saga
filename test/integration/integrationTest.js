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
      aggregateId: 'aggregate.id',
      revision: 'aggregate.revision',
      version: 'version',
      meta: 'meta'
    });

    expect(function () {
      pm.getInfo();
    }).to.throwError('/init');

    pm.init(done);
  });

  describe('requesting information', function () {

    it('it should return the expected information', function () {

      var info = pm.getInfo();
      expect(info.sagas.length).to.eql(4);
      expect(info.sagas[0].name).to.eql('orderConfirmed');
      expect(info.sagas[0].aggregate).to.eql('order');
      expect(info.sagas[0].context).to.eql('sale');
      expect(info.sagas[0].version).to.eql(0);
      expect(info.sagas[1].name).to.eql('orderCreated');
      expect(info.sagas[1].aggregate).to.eql('order');
      expect(info.sagas[1].context).to.eql('sale');
      expect(info.sagas[1].version).to.eql(0);
      expect(info.sagas[2].name).to.eql('paymentAccepted');
      expect(info.sagas[2].aggregate).to.eql('payment');
      expect(info.sagas[2].context).to.eql('sale');
      expect(info.sagas[2].version).to.eql(2);
      expect(info.sagas[3].name).to.eql('seatsReserved');
      expect(info.sagas[3].aggregate).to.eql('reservation');
      expect(info.sagas[3].context).to.eql('sale');
      expect(info.sagas[3].version).to.eql(0);

    });

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
          id: 'orderAggId',
          revision: 1
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
            id: 'seatsAggId',
            revision: 1
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
          expect(cmds[0].payload.costs).to.eql(520);
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

      describe('continue with the next step that will remove the timeout', function () {

        it('it should publish a command and it should callback without an error and with commands', function (done) {

          var publishedCommands = [];

          pm.onCommand(function (cmd) {
            publishedCommands.push(cmd);
          });

          var evt = {
            name: 'paymentAccepted',
            aggregate: {
              name: 'payment',
              id: 'payAggId',
              revision: 1
            },
            context: {
              name: 'sale'
            },
            version: 2,
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
            expect(cmds[0].name).to.eql('confirmOrder');
            expect(cmds[0].aggregate.id).to.eql('orderAggId');
            expect(cmds[0].payload.transactionId).to.be.a('string');
            expect(cmds[0].meta).to.eql(evt.meta);
            expect(sagaModels).to.be.an('array');
            expect(sagaModels.length).to.eql(1);
            expect(sagaModels[0].getTimeoutAt()).to.eql(undefined);
            expect(sagaModels[0].getTimeoutCommands()).to.eql(undefined);
            expect(publishedCommands.length).to.eql(1);
            expect(publishedCommands[0].id).to.be.a('string');
            expect(publishedCommands[0].name).to.eql('confirmOrder');
            expect(publishedCommands[0].aggregate.id).to.eql('orderAggId');
            expect(publishedCommands[0].payload.transactionId).to.be.a('string');
            expect(publishedCommands[0].meta).to.eql(evt.meta);

            done();
          });

        });

        describe('continue with the last step', function () {

          it('it should not publish any command and it should callback without an error and without commands', function (done) {

            var publishedCommands = [];

            pm.onCommand(function (cmd) {
              publishedCommands.push(cmd);
            });

            var evt = {
              name: 'orderConfirmed',
              aggregate: {
                name: 'order',
                id: 'orderAggId',
                revision: 2
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
              expect(cmds.length).to.eql(0);
              expect(sagaModels).to.be.an('array');
              expect(sagaModels.length).to.eql(1);
              expect(sagaModels[0].isDestroyed()).to.eql(true);
              expect(sagaModels[0].getTimeoutAt()).to.eql(undefined);
              expect(sagaModels[0].getTimeoutCommands()).to.eql(undefined);
              expect(publishedCommands.length).to.eql(0);

              done();
            });

          });

          describe('handling an event that was already handled', function () {

            it('it should not publish anything and callback with an error', function (done) {

              var publishedCommands = [];

              pm.onCommand(function (cmd) {
                publishedCommands.push(cmd);
              });

              var evt = {
                name: 'seatsReserved',
                aggregate: {
                  name: 'reservation',
                  id: 'seatsAggId',
                  revision: 1
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

              pm.handle(evt, function (errs, cmds, sagaModels) {
                expect(errs).to.be.ok();
                expect(errs.length).to.eql(1);
                expect(errs[0].name).to.eql('AlreadyHandledError');
                expect(cmds).not.to.be.ok();
                expect(sagaModels).not.to.be.ok();

                expect(publishedCommands.length).to.eql(0);

                pm.getLastEvent(function (err, evt) {
                  expect(err).not.be.ok();
                  expect(evt.aggregate.revision).to.eql(2);
                  done();
                });
              });

            });

          });

        });

      });

    });

  });

});
