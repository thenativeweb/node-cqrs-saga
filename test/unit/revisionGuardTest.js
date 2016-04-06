var expect = require('expect.js'),
  _ = require('lodash'),
  RevisionGuard = require('../../lib/revisionGuard'),
  revGuardStore = require('../../lib/revisionGuardStore');

describe('revisionGuard', function () {

  var store;

  before(function (done) {
    revGuardStore.create(function (err, s) {
      store = s;
      done();
    });
  });

  describe('creating a new guard', function () {

    it('it should not throw an error', function () {

      expect(function () {
        new RevisionGuard(store);
      }).not.to.throwError();

    });

    it('it should return a correct object', function () {

      var guard = new RevisionGuard(store);
      expect(guard.definition).to.be.an('object');
      expect(guard.defineEvent).to.be.a('function');
      expect(guard.onEventMissing).to.be.a('function');

    });

    describe('defining the event structure', function() {

      var guard;

      beforeEach(function () {
        guard = new RevisionGuard(store);
      });

      describe('using the defaults', function () {

        it('it should apply the defaults', function() {

          var defaults = _.cloneDeep(guard.definition);

          guard.defineEvent({
            payload: 'data',
            aggregate: 'aggName',
            context: 'ctx.Name',
            revision: 'rev',
            version: 'v.',
            meta: 'pass'
          });

          expect(defaults.correlationId).to.eql(guard.definition.correlationId);
          expect(defaults.id).to.eql(guard.definition.id);
          expect(guard.definition.payload).to.eql('data');
          expect(defaults.payload).not.to.eql(guard.definition.payload);
          expect(defaults.name).to.eql(guard.definition.name);
          expect(defaults.aggregateId).to.eql(guard.definition.aggregateId);
          expect(guard.definition.aggregate).to.eql('aggName');
          expect(defaults.aggregate).not.to.eql(guard.definition.aggregate);
          expect(guard.definition.context).to.eql('ctx.Name');
          expect(defaults.context).not.to.eql(guard.definition.context);
          expect(guard.definition.revision).to.eql('rev');
          expect(defaults.revision).not.to.eql(guard.definition.revision);
          expect(guard.definition.version).to.eql('v.');
          expect(defaults.version).not.to.eql(guard.definition.version);
          expect(guard.definition.meta).to.eql('pass');
          expect(defaults.meta).not.to.eql(guard.definition.meta);

        });

      });

      describe('overwriting the defaults', function () {

        it('it should apply them correctly', function() {

          var defaults = _.cloneDeep(guard.definition);

          guard.defineEvent({
            correlationId: 'cmdId',
            id: 'eventId',
            payload: 'data',
            name: 'defName',
            aggregateId: 'path.to.aggId',
            aggregate: 'aggName',
            context: 'ctx.Name',
            revision: 'rev',
            version: 'v.',
            meta: 'pass'
          });

          expect(guard.definition.correlationId).to.eql('cmdId');
          expect(defaults.correlationId).not.to.eql(guard.definition.correlationId);
          expect(guard.definition.id).to.eql('eventId');
          expect(defaults.id).not.to.eql(guard.definition.id);
          expect(guard.definition.payload).to.eql('data');
          expect(defaults.payload).not.to.eql(guard.definition.payload);
          expect(guard.definition.name).to.eql('defName');
          expect(defaults.name).not.to.eql(guard.definition.name);
          expect(guard.definition.aggregateId).to.eql('path.to.aggId');
          expect(defaults.aggregateId).not.to.eql(guard.definition.aggregateId);
          expect(guard.definition.aggregate).to.eql('aggName');
          expect(defaults.aggregate).not.to.eql(guard.definition.aggregate);
          expect(guard.definition.context).to.eql('ctx.Name');
          expect(defaults.context).not.to.eql(guard.definition.context);
          expect(guard.definition.revision).to.eql('rev');
          expect(defaults.revision).not.to.eql(guard.definition.revision);
          expect(guard.definition.version).to.eql('v.');
          expect(defaults.version).not.to.eql(guard.definition.version);
          expect(guard.definition.meta).to.eql('pass');
          expect(defaults.meta).not.to.eql(guard.definition.meta);

        });

      });

    });

    describe('guarding an event', function () {

      var guard;

      var evt1 = {
        id: 'evtId1',
        aggregate: {
          id: 'aggId1',
          name: 'agg'
        },
        context: {
          name: 'ctx'
        },
        revision: 1
      };

      var evt2 = {
        id: 'evtId2',
        aggregate: {
          id: 'aggId1',
          name: 'agg'
        },
        context: {
          name: 'ctx'
        },
        revision: 2
      };

      var evt3 = {
        id: 'evtId3',
        aggregate: {
          id: 'aggId1',
          name: 'agg'
        },
        context: {
          name: 'ctx'
        },
        revision: 3
      };

      before(function () {
        guard = new RevisionGuard(store, { queueTimeout: 200 });
        guard.defineEvent({
          correlationId: 'correlationId',
          id: 'id',
          payload: 'payload',
          name: 'name',
          aggregateId: 'aggregate.id',
          aggregate: 'aggregate.name',
          context: 'context.name',
          revision: 'revision',
          version: 'version',
          meta: 'meta'
        });
      });

      beforeEach(function (done) {
        guard.currentHandlingRevisions = {};
        store.clear(done);
      });

      describe('in correct order', function () {

        it('it should work as expected', function (done) {

          var guarded = 0;

          function check () {
            guarded++;

            if (guarded === 3) {
              done();
            }
          }

          guard.guard(evt1, function (err, finish) {
            expect(err).not.to.be.ok();

            finish(function (err) {
              expect(err).not.to.be.ok();
              expect(guarded).to.eql(0);
              check();
            });
          });

          setTimeout(function () {
            guard.guard(evt2, function (err, finish) {
              expect(err).not.to.be.ok();

              finish(function (err) {
                expect(err).not.to.be.ok();
                expect(guarded).to.eql(1);
                check();
              });
            });
          }, 10);

          setTimeout(function () {
            guard.guard(evt3, function (err, finish) {
              expect(err).not.to.be.ok();

              finish(function (err) {
                expect(err).not.to.be.ok();
                expect(guarded).to.eql(2);
                check();
              });
            });
          }, 20);

        });

        describe('but with slow beginning events', function () {

          var specialGuard;

          before(function () {
            specialGuard = new RevisionGuard(store, { queueTimeout: 2000, queueTimeoutMaxLoops: 15 });
            specialGuard.defineEvent({
              correlationId: 'correlationId',
              id: 'id',
              payload: 'payload',
              name: 'name',
              aggregateId: 'aggregate.id',
              aggregate: 'aggregate.name',
              context: 'context.name',
              revision: 'revision',
              version: 'version',
              meta: 'meta'
            });
          });

          beforeEach(function (done) {
            specialGuard.currentHandlingRevisions = {};
            store.clear(done);
          });

          it('it should work as expected', function (done) {

            var guarded = 0;

            function check () {
              guarded++;

              if (guarded === 3) {
                done();
              }
            }

            var start1 = Date.now();
            specialGuard.guard(evt1, function (err, finish1) {
              var diff1 = Date.now() - start1;
              console.log('guarded 1: ' + diff1);
              expect(err).not.to.be.ok();

              setTimeout(function () {
                start1 = Date.now();
                finish1(function (err) {
                  diff1 = Date.now() - start1;
                  console.log('finished 1: ' + diff1);
                  expect(err).not.to.be.ok();
                  expect(guarded).to.eql(0);
                  check();
                });
              }, 250);
            });

            var start2 = Date.now();
            specialGuard.guard(evt2, function (err, finish2) {
              var diff2 = Date.now() - start2;
              console.log('guarded 2: ' + diff2);
              expect(err).not.to.be.ok();

              start2 = Date.now();
              finish2(function (err) {
                diff2 = Date.now() - start2;
                console.log('finished 2: ' + diff2);
                expect(err).not.to.be.ok();
                expect(guarded).to.eql(1);
                check();
              });
            });

            var start3 = Date.now();
            specialGuard.guard(evt3, function (err, finish3) {
              var diff3 = Date.now() - start3;
              console.log('guarded 3: ' + diff3);
              expect(err).not.to.be.ok();

              start3 = Date.now();
              finish3(function (err) {
                diff3 = Date.now() - start3;
                console.log('finished 3: ' + diff3);
                expect(err).not.to.be.ok();
                expect(guarded).to.eql(2);
                check();
              });
            });

          });

        });

        describe('but having a startRevisionNumber', function () {

          var specialGuard;

          beforeEach(function (done) {
            specialGuard = new RevisionGuard(store, { queueTimeout: 200, queueTimeoutMaxLoops: 3, startRevisionNumber: 1 });
            specialGuard.defineEvent({
              correlationId: 'correlationId',
              id: 'id',
              payload: 'payload',
              name: 'name',
              aggregateId: 'aggregate.id',
              aggregate: 'aggregate.name',
              context: 'context.name',
              revision: 'revision',
              version: 'version',
              meta: 'meta'
            });
            specialGuard.currentHandlingRevisions = {};
            store.clear(done);
          });

          it('and guarding an event with revision greater than expected, it should emit an eventMissing event', function (done) {

            specialGuard.onEventMissing(function (info, e) {
              expect(info.aggregateId).to.equal(evt2.aggregate.id);
              expect(info.aggregateRevision).to.equal(evt2.revision);
              expect(info.guardRevision).to.equal(1);
              expect(e).to.equal(evt2);
              done();
            });

            specialGuard.guard(evt2, function (err, finish) {});

          });

          it('and guarding an event with revision like expected, it should work normally', function (done) {

            specialGuard.guard(evt1, function (err, finish) {
              expect(err).not.to.be.ok();
              finish(function (err) {
                expect(err).not.to.be.ok();
                done();
              });
            });

          });

          it('and guarding an event with revision smaller than expected, it work normally', function (done) {

            var evt0 = _.cloneDeep(evt1);
            evt0.revision = 0;

            specialGuard.guard(evt0, function (err, finish) {
              expect(err).not.to.be.ok();
              finish(function (err) {
                expect(err).not.to.be.ok();
                done();
              });
            });

          });

        });

      });

      describe('in wrong order', function () {

        it('it should work as expected', function (done) {

          var guarded = 0;

          function check () {
            guarded++;

//            if (guarded === 3) {
//              done();
//            }
          }

          guard.guard(evt1, function (err, finish) {
            expect(err).not.to.be.ok();

            finish(function (err) {
              expect(err).not.to.be.ok();
              expect(guarded).to.eql(0);
              check();
            });
          });

          setTimeout(function () {
            guard.guard(evt2, function (err, finish) {
              expect(err).not.to.be.ok();

              finish(function (err) {
                expect(err).not.to.be.ok();
                expect(guarded).to.eql(1);
                check();
              });
            });
          }, 30);

          setTimeout(function () {
            guard.guard(evt3, function (err, finish) {
              expect(err).not.to.be.ok();

              finish(function (err) {
                expect(err).not.to.be.ok();
                expect(guarded).to.eql(2);
                check();
              });
            });
            guard.guard(evt3, function (err, finish) {
              expect(err).to.be.ok();
              expect(err.name).to.eql('AlreadyHandlingError');
            });
          }, 10);

          setTimeout(function () {
            guard.guard(evt2, function (err) {
              expect(err).to.be.ok();
              expect(err.name).to.eql('AlreadyHandledError');
              expect(guarded).to.eql(3);

              guard.guard(evt3, function (err) {
                expect(err).to.be.ok();
                expect(err.name).to.eql('AlreadyHandledError');
                expect(guarded).to.eql(3);

                store.getLastEvent(function (err, evt) {
                  expect(err).not.to.be.ok();
                  expect(evt.id).to.eql(evt3.id);
                  done();
                });
              });
            });
          }, 300);

        });

      });

      describe('and missing something', function () {

        it('it should work as expected', function (done) {

          var guarded = 0;

          function check () {
            guarded++;

//            if (guarded === 3) {
//              done();
//            }
          }

          guard.onEventMissing(function (info, evt) {
            expect(guarded).to.eql(1);
            expect(evt).to.eql(evt3);
            expect(info.aggregateId).to.eql('aggId1');
            expect(info.aggregateRevision).to.eql(3);
            expect(info.guardRevision).to.eql(2);
            expect(info.aggregate).to.eql('agg');
            expect(info.context).to.eql('ctx');
            done();
          });

          guard.guard(evt1, function (err, finish) {
            expect(err).not.to.be.ok();

            finish(function (err) {
              expect(err).not.to.be.ok();
              expect(guarded).to.eql(0);
              check();
            });
          });

          setTimeout(function () {
            guard.guard(evt3, function (err, finish) {
              expect(err).not.to.be.ok();

              finish(function (err) {
                expect(err).not.to.be.ok();
                expect(guarded).to.eql(2);
                check();
              });
            });
          }, 20);

        });

      });

    });

  });

});
