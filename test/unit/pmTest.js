var expect = require('expect.js'),
  api = require('../../index'),
  async = require('async'),
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
              var s1Ret = [{i: '1'}, {i: '2'}];
              var s2Ret = [{i: '3'}];
              clb(null, [{ id: 's1',
                           getUndispatchedCommands: function () { return [].concat(s1Ret); },
                           removeUnsentCommand: function (c) {
                             s1Ret.splice(s1Ret.indexOf(c), 1);
                           },
                           toJSON: function () {
                             return { id: 's1' };
                           },
                           isDestroyed: function () {
                             return false;
                           }
                         },
                         { id: 's2',
                           getUndispatchedCommands: function () { return [].concat(s2Ret); },
                           removeUnsentCommand: function (c) {
                             s2Ret.splice(s2Ret.indexOf(c), 1);
                           },
                           toJSON: function () {
                             return { id: 's2' };
                           },
                           isDestroyed: function () {
                             return false;
                           }
                         }]);
            };

            pm.sagaStore.setCommandToDispatched = function (cId, sId, clb) {
              sagastoreCalled.push({ sagaId: sId, commandId: cId });
              clb(null);
            };

            pm.handle(evt, function (err, cmds, sagaModels) {
              expect(err).not.to.be.ok();
              expect(dispatchCalled).to.eql(true);
              expect(sagastoreCalled.length).to.eql(3);
              expect(sagastoreCalled[0].sagaId).to.eql('s1');
              expect(sagastoreCalled[0].commandId).to.eql('1');
              expect(sagastoreCalled[1].sagaId).to.eql('s1');
              expect(sagastoreCalled[1].commandId).to.eql('2');
              expect(sagastoreCalled[2].sagaId).to.eql('s2');
              expect(sagastoreCalled[2].commandId).to.eql('3');
              expect(onCommandCalled.length).to.eql(3);
              expect(onCommandCalled[0].i).to.eql('1');
              expect(onCommandCalled[1].i).to.eql('2');
              expect(onCommandCalled[2].i).to.eql('3');
              expect(cmds.length).to.eql(3);
              expect(cmds[0].i).to.eql('1');
              expect(cmds[1].i).to.eql('2');
              expect(cmds[2].i).to.eql('3');
              expect(sagaModels.length).to.eql(2);
              expect(sagaModels[0].id).to.eql('s1');
              expect(sagaModels[1].id).to.eql('s2');

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
              var s1Ret = [{i: '1'}, {i: '2'}];
              var s2Ret = [{i: '3'}];
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

            pm.sagaStore.setCommandToDispatched = function (cId, sId, clb) {
              sagastoreCalled.push({ sagaId: sId, commandId: cId });
              clb(null);

              if (sagastoreCalled.length === 3) {
                expect(dispatchCalled).to.eql(true);
                expect(sagastoreCalled.length).to.eql(3);
                expect(sagastoreCalled[0].sagaId).to.eql('s1');
                expect(sagastoreCalled[0].commandId).to.eql('1');
                expect(sagastoreCalled[1].sagaId).to.eql('s1');
                expect(sagastoreCalled[1].commandId).to.eql('2');
                expect(sagastoreCalled[2].sagaId).to.eql('s2');
                expect(sagastoreCalled[2].commandId).to.eql('3');
                expect(onCommandCalled.length).to.eql(3);
                expect(onCommandCalled[0].i).to.eql('1');
                expect(onCommandCalled[1].i).to.eql('2');
                expect(onCommandCalled[2].i).to.eql('3');

                done();
              }
            };

            pm.handle(evt);
          });

        });

      });

    });
    
    describe('having nothing in the saga store', function () {

      var pm;

      before(function (done) {
        pm = api({ sagaPath: __dirname });
        pm.init(done);
      });
      
      describe('calling getTimeoutedSagas', function () {
        
        it('it should work as expected', function (done) {

          pm.getTimeoutedSagas(function(err, sagas) {
            expect(err).not.to.be.ok();
            expect(sagas).to.be.an('array');
            expect(sagas).to.have.length(0);
            done();
          });
          
        });
        
      });

      describe('calling getOlderSagas', function() {

        describe('without a valid date object', function () {

          it('it should callback with an error', function (done) {

            pm.getOlderSagas({}, function(err, sagas) {
              expect(err).to.be.ok();
              expect(err.message).to.match(/date/);
              expect(sagas).not.to.be.ok();
              done();
            });

          });

        });

        describe('with a valid date object', function () {

          it('it should callback without an error', function (done) {

            pm.getOlderSagas(new Date(), function(err, sagas) {
              expect(err).not.to.be.ok();
              expect(sagas).to.be.an('array');
              expect(sagas).to.have.length(0);
              done();
            });

          });

        });

      });

      describe('calling getUndispatchedCommands', function() {

        it('it should callback with an empty array', function(done) {

          pm.getUndispatchedCommands(function(err, cmds) {
            expect(err).not.to.be.ok();
            expect(cmds).to.be.an('array');
            expect(cmds).to.have.length(0);
            done();
          });

        });

      });

      describe('calling setCommandToDispatched', function() {

        describe('without a valid commandId', function () {

          it('it should callback with an error', function (done) {

            pm.setCommandToDispatched({}, true, function(err) {
              expect(err).to.be.ok();
              expect(err.message).to.match(/command id/);
              done();
            });

          });

        });

        describe('without a valid sagaId', function () {

          it('it should callback with an error', function (done) {

            pm.setCommandToDispatched('123', true, function(err) {
              expect(err).to.be.ok();
              expect(err.message).to.match(/saga id/);
              done();
            });

          });

        });

        describe('with valid arguments', function () {

          it('it should callback without an error', function (done) {

            pm.setCommandToDispatched('1234', '4356', function(err, nothing) {
              expect(err).not.to.be.ok();
              expect(nothing).to.eql(undefined);
              done();
            });

          });

        });

        describe('calling removeSaga', function() {

          describe('without a valid id object', function () {

            it('it should callback with an error', function (done) {

              pm.removeSaga({}, function(err) {
                expect(err).to.be.ok();
                expect(err.message).to.match(/id/);
                done();
              });

            });

          });

          describe('with a valid id string', function () {

            it('it should callback without an error', function (done) {

              pm.removeSaga('123', function(err) {
                expect(err).not.to.be.ok();
                done();
              });

            });

          });

        });

      });

    });

    describe('having some data in the saga store', function () {

      var pm;

      before(function (done) {
        pm = api({ sagaPath: __dirname });
        pm.init(done);
      });

      var saga1;
      var cmds1;

      var saga2;
      var cmds2;

      var saga3;
      var cmds3;

      var saga4;
      var cmds4;

      beforeEach(function (done) {
        saga1 = { id: 'sagaId1', _commitStamp: new Date(2014, 3, 1), _timeoutAt: new Date(2214, 3, 17), data: 'sagaData1' };
        cmds1 = [{ id: 'cmdId1', payload: { id: 'cmdId1', data: 'cmdData1' } }];

        saga2 = { id: 'sagaId2', _commitStamp: new Date(2014, 3, 2), _timeoutAt: new Date(2014, 3, 15), data: 'sagaData2' };
        cmds2 = [{ id: 'cmdId2', payload: { id: 'cmdId2', data: 'cmdData2' } }, { id: 'cmdId22', payload: { id: 'cmdId22', data: 'cmdData22' } }];

        saga3 = { id: 'sagaId3', _commitStamp: new Date(2014, 3, 5), data: 'sagaData3' };
        cmds3 = [{ id: 'cmdId3', payload: { id: 'cmdId3', data: 'cmdData3' } }];

        saga4 = { id: 'sagaId4', _commitStamp: new Date(2014, 3, 7), data: 'sagaData4' };
        cmds4 = [];
        
        pm.sagaStore.clear(function () {
          async.series([
            function (callback) {
              pm.sagaStore.save(saga1, cmds1, callback);
            },
            function (callback) {
              pm.sagaStore.save(saga2, cmds2, callback);
            },
            function (callback) {
              pm.sagaStore.save(saga3, cmds3, callback);
            },
            function (callback) {
              pm.sagaStore.save(saga4, cmds4, callback);
            }
          ], done);
        });
      });

      describe('calling getTimeoutedSagas', function () {

        it('it should callback all the timeouted sagas', function (done) {

          pm.getTimeoutedSagas(function (err, sagas) {
            expect(err).not.to.be.ok();
            expect(sagas).to.be.an('array');
            expect(sagas.length).to.eql(1);
            expect(sagas[0].id).to.eql(saga2.id);
            expect(sagas[0].getCommitStamp().getTime()).to.eql(saga2._commitStamp.getTime());
            expect(sagas[0].getTimeoutAt().getTime()).to.eql(saga2._timeoutAt.getTime());
            expect(sagas[0].get('data')).to.eql(saga2.data);
            done();
          });

        });

        describe('calling commit on a saga object', function () {
          
          describe('with a callback', function () {

            it('it should callback with an error', function (done) {

              pm.getTimeoutedSagas(function (err, sagas) {
                expect(err).not.to.be.ok();
                expect(sagas).to.be.an('array');
                expect(sagas.length).to.eql(1);
                sagas[0].commit(function (err) {
                  expect(err.message).to.match(/remove/);
                  done();
                });
              });

            });
            
          });

          describe('without a callback', function () {

            it('it should throw an error', function (done) {

              pm.getTimeoutedSagas(function (err, sagas) {
                expect(err).not.to.be.ok();
                expect(sagas).to.be.an('array');
                expect(sagas.length).to.eql(1);
                expect(function() {
                  sagas[0].commit();
                }).to.throwError(/remove/);
                done();
              });

            });

          });

          describe('having marked the saga as destroyed', function () {

            it('it should work as expected', function (done) {

              pm.getTimeoutedSagas(function (err, sagas) {
                expect(err).not.to.be.ok();
                expect(sagas).to.be.an('array');
                expect(sagas.length).to.eql(1);
                sagas[0].destroy();
                sagas[0].commit(function (err) {
                  expect(err).not.to.be.ok();

                  pm.getTimeoutedSagas(function (err, sagas) {
                    expect(err).not.to.be.ok();
                    expect(sagas).to.be.an('array');
                    expect(sagas.length).to.eql(0);
                    done();
                  });
                });
              });

            });

          });

        });

      });

      describe('calling getOlderSagas', function () {

        it('it should callback the expected sagas', function (done) {

          pm.getOlderSagas(new Date(2014, 3, 3), function (err, sagas) {
            expect(err).not.to.be.ok();
            expect(sagas).to.be.an('array');
            expect(sagas.length).to.eql(2);
            expect(sagas[0].id).to.eql(saga1.id);
            expect(sagas[0].getCommitStamp().getTime()).to.eql(saga1._commitStamp.getTime());
            expect(sagas[0].getTimeoutAt().getTime()).to.eql(saga1._timeoutAt.getTime());
            expect(sagas[0].get('data')).to.eql(saga1.data);
            expect(sagas[1].id).to.eql(saga2.id);
            expect(sagas[1].getCommitStamp().getTime()).to.eql(saga2._commitStamp.getTime());
            expect(sagas[1].getTimeoutAt().getTime()).to.eql(saga2._timeoutAt.getTime());
            expect(sagas[1].get('data')).to.eql(saga2.data);

            done();
          });

        });

        describe('calling commit on a saga object', function () {

          describe('with a callback', function () {

            it('it should callback with an error', function (done) {

              pm.getOlderSagas(new Date(2014, 3, 3), function (err, sagas) {
                expect(err).not.to.be.ok();
                expect(sagas).to.be.an('array');
                expect(sagas.length).to.eql(2);
                sagas[0].commit(function (err) {
                  expect(err.message).to.match(/remove/);
                  done();
                });
              });

            });

          });

          describe('without a callback', function () {

            it('it should throw an error', function (done) {

              pm.getOlderSagas(new Date(2014, 3, 3), function (err, sagas) {
                expect(err).not.to.be.ok();
                expect(sagas).to.be.an('array');
                expect(sagas.length).to.eql(2);
                expect(function() {
                  sagas[0].commit();
                }).to.throwError(/remove/);
                done();
              });

            });

          });

          describe('having marked the saga as destroyed', function () {

            it('it should work as expected', function (done) {

              pm.getOlderSagas(new Date(2014, 3, 3), function (err, sagas) {
                expect(err).not.to.be.ok();
                expect(sagas).to.be.an('array');
                expect(sagas.length).to.eql(2);
                sagas[0].destroy();
                sagas[0].commit(function (err) {
                  expect(err).not.to.be.ok();

                  pm.getOlderSagas(new Date(2014, 3, 3), function (err, sagas) {
                    expect(err).not.to.be.ok();
                    expect(sagas).to.be.an('array');
                    expect(sagas.length).to.eql(1);
                    expect(sagas[0].id).to.eql(saga2.id);
                    expect(sagas[0].getCommitStamp().getTime()).to.eql(saga2._commitStamp.getTime());
                    expect(sagas[0].getTimeoutAt().getTime()).to.eql(saga2._timeoutAt.getTime());
                    expect(sagas[0].get('data')).to.eql(saga2.data);

                    done();
                  });
                });
              });

            });

          });

        });

      });

      describe('calling getUndispatchedCommands', function () {

        it('it should callback with the expected commands', function (done) {

          pm.getUndispatchedCommands(function (err, cmds) {
            expect(err).not.to.be.ok();
            expect(cmds).to.be.an('array');
            expect(cmds.length).to.eql(4);
            expect(cmds[0].sagaId).to.eql(saga1.id);
            expect(cmds[0].commandId).to.eql(cmds1[0].id);
            expect(cmds[0].command.id).to.eql(cmds1[0].payload.id);
            expect(cmds[0].command.data).to.eql(cmds1[0].payload.data);
            expect(cmds[1].sagaId).to.eql(saga2.id);
            expect(cmds[1].commandId).to.eql(cmds2[0].id);
            expect(cmds[1].command.id).to.eql(cmds2[0].payload.id);
            expect(cmds[1].command.data).to.eql(cmds2[0].payload.data);
            expect(cmds[2].sagaId).to.eql(saga2.id);
            expect(cmds[2].commandId).to.eql(cmds2[1].id);
            expect(cmds[2].command.id).to.eql(cmds2[1].payload.id);
            expect(cmds[2].command.data).to.eql(cmds2[1].payload.data);
            expect(cmds[3].sagaId).to.eql(saga3.id);
            expect(cmds[3].commandId).to.eql(cmds3[0].id);
            expect(cmds[3].command.id).to.eql(cmds3[0].payload.id);
            expect(cmds[3].command.data).to.eql(cmds3[0].payload.data);

            done();
          });

        });

      });

      describe('calling setCommandToDispatched', function () {

        it('it should remove this command from store', function (done) {

          pm.setCommandToDispatched('cmdId2', 'sagaId2', function (err) {
            expect(err).not.to.be.ok();

            pm.getUndispatchedCommands(function (err, cmds) {
              expect(err).not.to.be.ok();
              expect(cmds).to.be.an('array');
              expect(cmds.length).to.eql(3);
              expect(cmds[0].sagaId).to.eql(saga1.id);
              expect(cmds[0].commandId).to.eql(cmds1[0].id);
              expect(cmds[0].command.id).to.eql(cmds1[0].payload.id);
              expect(cmds[0].command.data).to.eql(cmds1[0].payload.data);
              expect(cmds[1].sagaId).to.eql(saga2.id);
              expect(cmds[1].commandId).to.eql(cmds2[1].id);
              expect(cmds[1].command.id).to.eql(cmds2[1].payload.id);
              expect(cmds[1].command.data).to.eql(cmds2[1].payload.data);
              expect(cmds[2].sagaId).to.eql(saga3.id);
              expect(cmds[2].commandId).to.eql(cmds3[0].id);
              expect(cmds[2].command.id).to.eql(cmds3[0].payload.id);
              expect(cmds[2].command.data).to.eql(cmds3[0].payload.data);

              done();
            });
          });

        });

      });

      describe('calling removeSaga', function () {

        it('it should remove the requesting saga and its commands', function (done) {

          pm.removeSaga('sagaId2', function (err) {
            expect(err).not.to.be.ok();

            pm.getTimeoutedSagas(function (err, sagas) {
              expect(err).not.to.be.ok();
              expect(sagas).to.be.an('array');
              expect(sagas.length).to.eql(0);

              pm.getOlderSagas(new Date(2314, 3, 17), function (err, sagas) {
                expect(err).not.to.be.ok();
                expect(sagas).to.be.an('array');
                expect(sagas.length).to.eql(3);
                expect(sagas[0].id).to.eql(saga1.id);
                expect(sagas[0].getCommitStamp().getTime()).to.eql(saga1._commitStamp.getTime());
                expect(sagas[0].getTimeoutAt().getTime()).to.eql(saga1._timeoutAt.getTime());
                expect(sagas[0].get('data')).to.eql(saga1.data);
                expect(sagas[1].id).to.eql(saga3.id);
                expect(sagas[1].getCommitStamp().getTime()).to.eql(saga3._commitStamp.getTime());
                expect(sagas[1].get('data')).to.eql(saga3.data);
                expect(sagas[2].id).to.eql(saga4.id);
                expect(sagas[2].getCommitStamp().getTime()).to.eql(saga4._commitStamp.getTime());
                expect(sagas[2].get('data')).to.eql(saga4.data);

                pm.getUndispatchedCommands(function (err, cmds) {
                  expect(err).not.to.be.ok();
                  expect(cmds).to.be.an('array');
                  expect(cmds.length).to.eql(2);
                  expect(cmds[0].sagaId).to.eql(saga1.id);
                  expect(cmds[0].commandId).to.eql(cmds1[0].id);
                  expect(cmds[0].command.id).to.eql(cmds1[0].payload.id);
                  expect(cmds[0].command.data).to.eql(cmds1[0].payload.data);
                  expect(cmds[1].sagaId).to.eql(saga3.id);
                  expect(cmds[1].commandId).to.eql(cmds3[0].id);
                  expect(cmds[1].command.id).to.eql(cmds3[0].payload.id);
                  expect(cmds[1].command.data).to.eql(cmds3[0].payload.data);

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
