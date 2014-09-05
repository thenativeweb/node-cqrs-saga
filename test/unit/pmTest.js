var expect = require('expect.js'),
  api = require('../../index'),
  _ = require('lodash');

describe('power management', function () {

  it('it should be a function', function () {

    expect(api).to.be.a('function');

  });

  it('it should have the correct api', function () {

    expect(api.defineSaga).to.be.a('function');

  });

  describe('calling that function', function () {

    describe('without options', function () {

      it('it should throw an error', function () {

        expect(api).to.throwError('/sagaPath/');

      });

    });

    describe('with all mandatory options', function () {

      it('it should return as expected', function () {

        var pm = api({ sagaPath: __dirname });
        expect(pm).to.be.a('object');
        expect(pm.on).to.be.a('function');
        expect(pm.sagaStore).to.be.an('object');
        expect(pm.sagaStore.on).to.be.a('function');
        expect(pm.defineCommand).to.be.a('function');
        expect(pm.defineEvent).to.be.a('function');
        expect(pm.idGenerator).to.be.a('function');
        expect(pm.onCommand).to.be.a('function');
        expect(pm.init).to.be.a('function');
        expect(pm.handle).to.be.a('function');
        
        expect(pm.getTimeoutedSagas).to.be.a('function');
        expect(pm.getOlderSagas).to.be.a('function');
        expect(pm.getUndispatchedCommands).to.be.a('function');
        expect(pm.setCommandToDispatched).to.be.a('function');
        expect(pm.removeSaga).to.be.a('function');

      });

    });

    describe('defining an id generator function', function() {

      var pm;

      beforeEach(function () {
        pm = api({ sagaPath: __dirname });
        pm.getNewId = null;
      });

      describe('in a synchronous way', function() {

        it('it should be transformed internally to an asynchronous way', function(done) {

          pm.idGenerator(function () {
            var id = require('node-uuid').v4().toString();
            return id;
          });

          pm.getNewId(function (err, id) {
            expect(id).to.be.a('string');
            done();
          });

        });

      });

      describe('in an synchronous way', function() {

        it('it should be taken as it is', function(done) {

          pm.idGenerator(function (callback) {
            setTimeout(function () {
              var id = require('node-uuid').v4().toString();
              callback(null, id);
            }, 10);
          });

          pm.getNewId(function (err, id) {
            expect(id).to.be.a('string');
            done();
          });

        });

      });

    });

    describe('defining the command structure', function() {

      var domain;

      beforeEach(function () {
        domain = api({ sagaPath: __dirname });
      });

      describe('using the defaults', function () {

        it('it should apply the defaults', function() {

          var defaults = _.cloneDeep(domain.definitions.command);

          domain.defineCommand({
            meta: 'pass'
          });

          expect(defaults.id).to.eql(domain.definitions.command.id);
          expect(domain.definitions.command.meta).to.eql('pass');
          expect(defaults.meta).not.to.eql(domain.definitions.command.meta);

        });

      });

      describe('overwriting the defaults', function () {

        it('it should apply them correctly', function() {

          var defaults = _.cloneDeep(domain.definitions.command);

          domain.defineCommand({
            id: 'commandId',
            meta: 'pass'
          });

          expect(domain.definitions.command.id).to.eql('commandId');
          expect(defaults.id).not.to.eql(domain.definitions.command.id);
          expect(domain.definitions.command.meta).to.eql('pass');
          expect(defaults.meta).not.to.eql(domain.definitions.command.meta);

        });

      });

    });

    describe('defining the event structure', function() {

      var domain;

      beforeEach(function () {
        domain = api({ sagaPath: __dirname });
      });

      describe('using the defaults', function () {

        it('it should apply the defaults', function() {

          var defaults = _.cloneDeep(domain.definitions.event);

          domain.defineEvent({
            aggregate: 'aggName',
            context: 'ctx.Name',
            version: 'v.',
            meta: 'pass'
          });

          expect(defaults.id).to.eql(domain.definitions.event.id);
          expect(defaults.name).to.eql(domain.definitions.event.name);
          expect(domain.definitions.event.aggregate).to.eql('aggName');
          expect(defaults.aggregate).not.to.eql(domain.definitions.event.aggregate);
          expect(domain.definitions.event.context).to.eql('ctx.Name');
          expect(defaults.context).not.to.eql(domain.definitions.event.context);
          expect(domain.definitions.event.version).to.eql('v.');
          expect(defaults.version).not.to.eql(domain.definitions.event.version);
          expect(domain.definitions.event.meta).to.eql('pass');
          expect(defaults.meta).not.to.eql(domain.definitions.event.meta);

        });

      });

      describe('overwriting the defaults', function () {

        it('it should apply them correctly', function() {

          var defaults = _.cloneDeep(domain.definitions.event);

          domain.defineEvent({
            id: 'eventId',
            name: 'defName',
            aggregate: 'aggName',
            context: 'ctx.Name',
            version: 'v.',
            meta: 'pass'
          });


          expect(domain.definitions.event.id).to.eql('eventId');
          expect(defaults.id).not.to.eql(domain.definitions.event.id);
          expect(domain.definitions.event.name).to.eql('defName');
          expect(defaults.name).not.to.eql(domain.definitions.event.name);
          expect(domain.definitions.event.aggregate).to.eql('aggName');
          expect(defaults.aggregate).not.to.eql(domain.definitions.event.aggregate);
          expect(domain.definitions.event.context).to.eql('ctx.Name');
          expect(defaults.context).not.to.eql(domain.definitions.event.context);
          expect(domain.definitions.event.version).to.eql('v.');
          expect(defaults.version).not.to.eql(domain.definitions.event.version);
          expect(domain.definitions.event.meta).to.eql('pass');
          expect(defaults.meta).not.to.eql(domain.definitions.event.meta);

        });

      });

    });

    describe('defining onCommand handler', function () {

      var pm;

      beforeEach(function () {
        pm = api({ sagaPath: __dirname });
        pm.onCommandHandle = null;
      });

      describe('in a synchronous way', function() {

        it('it should be transformed internally to an asynchronous way', function(done) {

          var called = false;
          pm.onCommand(function (cmd) {
            expect(cmd.my).to.eql('cmd');
            called = true;
          });

          pm.onCommandHandle({ my: 'cmd' }, function (err) {
            expect(err).not.to.be.ok();
            expect(called).to.eql(true);
            done();
          });

        });

      });

      describe('in an synchronous way', function() {

        it('it should be taken as it is', function(done) {

          var called = false;
          pm.onCommand(function (cmd, callback) {
            setTimeout(function () {
              expect(cmd.my).to.eql('cmd');
              called = true;
              callback(null);
            }, 10);
          });

          pm.onCommandHandle({ my: 'cmd' }, function (err) {
            expect(err).not.to.be.ok();
            expect(called).to.eql(true);
            done();
          });

        });

      });

    });

    describe('initializing', function () {

      var pm;

      beforeEach(function () {
        pm = api({ sagaPath: __dirname });
        pm.defineCommand({
          id: 'i',
          meta: 'm'
        });
        pm.defineEvent({
          id: 'i',
          name: 'n',
          context: 'c',
          aggregate: 'a',
          version: 'v',
          meta: 'm'
        });
      });

      describe('with a callback', function () {

        it('it should work as expected', function (done) {

          var called = 0;
          pm.sagaStore.once('connect', function () {
            called++;
          });
          pm.once('connect', function () {
            called++;
          });

          pm.init(function (err) {
            expect(err).not.to.be.ok();
            expect(called).to.eql(2);
            done();
          });

        });

      });

      describe('without a callback', function () {

        it('it should work as expected', function (done) {

          var called = 0;

          function check () {
            called++;
            if (called >= 2) {
              done();
            }
          }

          pm.sagaStore.once('connect', function () {
            check();
          });
          pm.once('connect', function () {
            check();
          });

          pm.init();

        });

      });

    });

    describe('handling an event', function () {

      var pm;

      beforeEach(function () {
        pm = api({ sagaPath: __dirname });
        pm.defineCommand({
          id: 'i',
          meta: 'm'
        });
        pm.defineEvent({
          id: 'i',
          name: 'n',
          context: 'c',
          aggregate: 'a',
          version: 'v',
          meta: 'm'
        });
      });

      describe('with a callback', function () {

        it('it should work as expected', function (done) {

          var evt = { i: 'evtId', n: 'evtName', ai: 'aggregateId', c: 'context', p: 'payload', r: 'revision', v: 'version', m: 'meta' };
          var dispatchCalled = false;
          var sagastoreCalled = [];
          var onCommandCalled = [];

          pm.onCommand(function (c) {
            onCommandCalled.push(c);
          });

          pm.init(function (err) {
            expect(err).not.to.be.ok();

            pm.eventDispatcher.dispatch = function (e, clb) {
              dispatchCalled = true;
              var s1Ret = [{c: '1'}, {c: '2'}];
              var s2Ret = [{c: '3'}];
              clb(null, [{ id: 's1',
                           getUndispatchedCommands: function () { return [].concat(s1Ret); },
                           removeUnsentCommand: function (c) {
                             s1Ret.splice(s1Ret.indexOf(c), 1);
                           }
                         },
                         { id: 's2',
                           getUndispatchedCommands: function () { return [].concat(s2Ret); },
                           removeUnsentCommand: function (c) {
                             s2Ret.splice(s2Ret.indexOf(c), 1);
                           }
                         }]);
            };

            pm.sagaStore.setCommandToDispatched = function (sId, c, clb) {
              sagastoreCalled.push({ sagaId: sId, command: c });
              clb(null);
            };

            pm.handle(evt, function (err, cmds, sagaModels) {
              expect(err).not.to.be.ok();
              expect(dispatchCalled).to.eql(true);
              expect(sagastoreCalled.length).to.eql(3);
              expect(sagastoreCalled[0].sagaId).to.eql('s1');
              expect(sagastoreCalled[0].command.c).to.eql('1');
              expect(sagastoreCalled[1].sagaId).to.eql('s1');
              expect(sagastoreCalled[1].command.c).to.eql('2');
              expect(sagastoreCalled[2].sagaId).to.eql('s2');
              expect(sagastoreCalled[2].command.c).to.eql('3');
              expect(onCommandCalled.length).to.eql(3);
              expect(onCommandCalled[0].c).to.eql('1');
              expect(onCommandCalled[1].c).to.eql('2');
              expect(onCommandCalled[2].c).to.eql('3');
              expect(cmds.length).to.eql(3);
              expect(cmds[0].c).to.eql('1');
              expect(cmds[1].c).to.eql('2');
              expect(cmds[2].c).to.eql('3');
              expect(sagaModels.length).to.eql(2);
              expect(sagaModels[0].id).to.eql('s1');
              expect(sagaModels[0].getUndispatchedCommands().length).to.eql(0);
              expect(sagaModels[1].id).to.eql('s2');
              expect(sagaModels[1].getUndispatchedCommands().length).to.eql(0);

              done();
            });
          });

        });

      });

      describe('with a callback', function () {

        it('it should work as expected', function (done) {

          var evt = { i: 'evtId', n: 'evtName', ai: 'aggregateId', c: 'context', p: 'payload', r: 'revision', v: 'version', m: 'meta' };
          var dispatchCalled = false;
          var sagastoreCalled = [];
          var onCommandCalled = [];

          pm.onCommand(function (c) {
            onCommandCalled.push(c);
          });

          pm.init(function (err) {
            expect(err).not.to.be.ok();

            pm.eventDispatcher.dispatch = function (e, clb) {
              dispatchCalled = true;
              var s1Ret = [{c: '1'}, {c: '2'}];
              var s2Ret = [{c: '3'}];
              clb(null, [{ id: 's1',
                getUndispatchedCommands: function () { return [].concat(s1Ret); },
                removeUnsentCommand: function (c) {
                  s1Ret.splice(s1Ret.indexOf(c), 1);
                }
              },
                { id: 's2',
                  getUndispatchedCommands: function () { return [].concat(s2Ret); },
                  removeUnsentCommand: function (c) {
                    s2Ret.splice(s2Ret.indexOf(c), 1);
                  }
                }]);
            };

            pm.sagaStore.setCommandToDispatched = function (sId, c, clb) {
              sagastoreCalled.push({ sagaId: sId, command: c });
              clb(null);

              if (sagastoreCalled.length === 3) {
                expect(dispatchCalled).to.eql(true);
                expect(sagastoreCalled.length).to.eql(3);
                expect(sagastoreCalled[0].sagaId).to.eql('s1');
                expect(sagastoreCalled[0].command.c).to.eql('1');
                expect(sagastoreCalled[1].sagaId).to.eql('s1');
                expect(sagastoreCalled[1].command.c).to.eql('2');
                expect(sagastoreCalled[2].sagaId).to.eql('s2');
                expect(sagastoreCalled[2].command.c).to.eql('3');
                expect(onCommandCalled.length).to.eql(3);
                expect(onCommandCalled[0].c).to.eql('1');
                expect(onCommandCalled[1].c).to.eql('2');
                expect(onCommandCalled[2].c).to.eql('3');

                done();
              }
            };

            pm.handle(evt);
          });

        });

      });

    });

  });

});
