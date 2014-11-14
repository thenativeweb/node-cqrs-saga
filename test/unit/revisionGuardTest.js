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
    })
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
                done();
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
