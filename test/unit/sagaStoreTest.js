var expect = require('expect.js'),
  async = require('async'),
  _ = require('lodash'),
  sagastore = require('../../lib/store'),
  ConcurrencyError = require('../../lib/errors/concurrencyError'),
  Base = require('../../lib/store/base'),
  InMemory = require('../../lib/store/databases/inmemory');

describe('sagaStore', function() {

  it('it should have the correct interface', function() {

    expect(sagastore).to.be.an('object');
    expect(sagastore.create).to.be.a('function');
    expect(sagastore.Store).to.eql(Base);

  });

  describe('calling create', function() {

    describe('without options', function() {

      it('it should return with the in memory queue', function() {

        var lock = sagastore.create();
        expect(lock).to.be.a('object');

      });

      describe('but with a callback', function() {

        it('it should callback with lock object', function(done) {

          sagastore.create(function(err, lock) {
            expect(err).not.to.be.ok();
            expect(lock).to.be.a('object');
            done();
          });

        });

      });

    });

    describe('with options of a non existing db implementation', function() {

      it('it should throw an error', function() {

        expect(function() {
          sagastore.create({ type: 'strangeDb' });
        }).to.throwError();

      });

      it('it should callback with an error', function(done) {

        expect(function() {
          sagastore.create({ type: 'strangeDb' }, function(err) {
            expect(err).to.be.ok();
            done();
          });
        }).to.throwError();

      });

    });

    describe('with options of an own db implementation', function() {

      it('it should return with the an instance of that implementation', function() {

        var store = sagastore.create({ type: InMemory });
        expect(store).to.be.a(InMemory);

      });

    });

    describe('with options containing a type property with the value of', function() {

      var types = ['inmemory', 'mongodb', 'redis'/*, 'azuretable'*/];

      types.forEach(function(type) {

        describe('"' + type + '"', function() {

          var store;

          describe('without callback', function() {

            afterEach(function(done) {
              store.disconnect(done);
            });

            it('it should return with the correct lock', function() {

              store = sagastore.create({ type: type });
              expect(store).to.be.a('object');
              expect(store).to.be.a(Base);
              expect(store.connect).to.be.a('function');
              expect(store.disconnect).to.be.a('function');
              expect(store.getNewId).to.be.a('function');
              expect(store.remove).to.be.a('function');
              expect(store.save).to.be.a('function');
              expect(store.getTimeoutedSagas).to.be.a('function');
              expect(store.getOlderSagas).to.be.a('function');
              expect(store.getUndispatchedCommands).to.be.a('function');
              expect(store.setCommandToDispatched).to.be.a('function');

            });

          });

          describe('with callback', function() {

            afterEach(function(done) {
              store.disconnect(done);
            });

            it('it should return with the correct lock', function(done) {

              sagastore.create({ type: type }, function(err, resS) {
                expect(err).not.to.be.ok();
                store = resS;
                expect(store).to.be.a('object');
                done();
              });

            });

          });

          describe('calling connect', function () {

            afterEach(function(done) {
              store.disconnect(done);
            });

            describe('with a callback', function () {

              it('it should callback successfully', function(done) {

                store = sagastore.create({ type: type });
                store.connect(function (err) {
                  expect(err).not.to.be.ok();
                  done();
                });

              });

            });

            describe('without a callback', function () {

              it('it should emit connect', function(done) {

                store = sagastore.create({ type: type });
                store.once('connect', done);
                store.connect();

              });

            });

          });

          describe('having connected', function() {

            describe('calling disconnect', function() {

              beforeEach(function(done) {
                var store = sagastore.create({ type: type });
                store.connect(done);
              });

              it('it should callback successfully', function(done) {

                store.disconnect(function(err) {
                  expect(err).not.to.be.ok();
                  done();
                });

              });

              it('it should emit disconnect', function(done) {

                store.once('disconnect', done);
                store.disconnect();

              });

            });

            describe('using the lock', function() {

              before(function(done) {
                store = sagastore.create({ type: type });
                store.connect(done);
              });

              describe('calling getNewId', function() {

                it('it should callback with a new Id as string', function(done) {

                  store.getNewId(function(err, id) {
                    expect(err).not.to.be.ok();
                    expect(id).to.be.a('string');
                    done();
                  });

                });

              });

              describe('having no entries', function() {

                before(function(done) {
                  store.clear(done);
                });

                describe('calling get', function() {

                  describe('without a valid id', function () {

                    it('it should callback with an error', function (done) {

                      store.get({}, function(err) {
                        expect(err).to.be.ok();
                        expect(err.message).to.match(/id/);
                        done();
                      });

                    });

                  });

                  describe('with a valid id', function () {

                    it('it should callback without an error', function (done) {

                      store.get('123', function(err, saga) {
                        expect(err).not.to.be.ok();
                        expect(saga).to.eql(null);
                        done();
                      });

                    });

                  });

                });

                describe('calling getTimeoutedSagas', function() {

                  it('it should callback with an empty array', function(done) {

                    store.getTimeoutedSagas(function(err, sagas) {
                      expect(err).not.to.be.ok();
                      expect(sagas).to.be.an('array');
                      expect(sagas).to.have.length(0);
                      done();
                    });

                  });

                });

                describe('calling getUndispatchedCommands', function() {

                  it('it should callback with an empty array', function(done) {

                    store.getUndispatchedCommands(function(err, cmds) {
                      expect(err).not.to.be.ok();
                      expect(cmds).to.be.an('array');
                      expect(cmds).to.have.length(0);
                      done();
                    });

                  });

                });

                describe('calling getOlderSagas', function() {

                  describe('without a valid date object', function () {

                    it('it should callback with an error', function (done) {

                      store.getOlderSagas({}, function(err, sagas) {
                        expect(err).to.be.ok();
                        expect(err.message).to.match(/date/);
                        expect(sagas).not.to.be.ok();
                        done();
                      });

                    });

                  });

                  describe('with a valid date object', function () {

                    it('it should callback without an error', function (done) {

                      store.getOlderSagas(new Date(), function(err, sagas) {
                        expect(err).not.to.be.ok();
                        expect(sagas).to.be.an('array');
                        expect(sagas).to.have.length(0);
                        done();
                      });

                    });

                  });

                });

                describe('calling remove', function() {

                  describe('without a valid id object', function () {

                    it('it should callback with an error', function (done) {

                      store.remove({}, function(err) {
                        expect(err).to.be.ok();
                        expect(err.message).to.match(/id/);
                        done();
                      });

                    });

                  });

                  describe('with a valid id string', function () {

                    it('it should callback without an error', function (done) {

                      store.remove('123', function(err) {
                        expect(err).not.to.be.ok();
                        done();
                      });

                    });

                  });

                });

                describe('calling save', function() {

                  describe('without a valid saga object', function () {

                    it('it should callback with an error', function (done) {

                      store.save({}, true, function(err) {
                        expect(err).to.be.ok();
                        expect(err.message).to.match(/id/);
                        done();
                      });

                    });

                  });

                  describe('without a valid commands object', function () {

                    it('it should callback with an error', function (done) {

                      store.save({ id: '1234', _commitStamp: new Date() }, [{}], function(err) {
                        expect(err).to.be.ok();
                        expect(err.message).to.match(/command/);
                        done();
                      });

                    });

                  });

                  describe('with valid arguments', function () {

                    it('it should callback without an error', function (done) {

                      store.save({ id: '1234', _commitStamp: new Date() }, [{ id: '234', payload: { id: '234' } }], function(err, nothing) {
                      expect(err).not.to.be.ok();
                      expect(nothing).to.eql(undefined);
                        done();
                      });

                    });

                  });

                });

                describe('calling setCommandToDispatched', function() {

                  describe('without a valid commandId', function () {

                    it('it should callback with an error', function (done) {

                      store.setCommandToDispatched({}, true, function(err) {
                        expect(err).to.be.ok();
                        expect(err.message).to.match(/command id/);
                        done();
                      });

                    });

                  });

                  describe('without a valid sagaId', function () {

                    it('it should callback with an error', function (done) {

                      store.setCommandToDispatched('123', true, function(err) {
                        expect(err).to.be.ok();
                        expect(err.message).to.match(/saga id/);
                        done();
                      });

                    });

                  });

                  describe('with valid arguments', function () {

                    it('it should callback without an error', function (done) {

                      store.setCommandToDispatched('1234', '4356', function(err, nothing) {
                      expect(err).not.to.be.ok();
                      expect(nothing).to.eql(undefined);
                        done();
                      });

                    });

                  });

                });

              });

              describe('having some saved sagas', function() {

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

                  store.clear(function () {
                    async.series([
                      function (callback) {
                        store.save(saga1, cmds1, callback);
                      },
                      function (callback) {
                        store.save(saga2, cmds2, callback);
                      },
                      function (callback) {
                        store.save(saga3, cmds3, callback);
                      },
                      function (callback) {
                        store.save(saga4, cmds4, callback);
                      }
                    ], done);
                  });
                });

                describe('calling get', function () {

                  it('it should callback the requested saga object', function (done) {

                    store.get('sagaId1', function (err, saga) {
                      expect(err).not.to.be.ok();
                      expect(saga).to.be.an('object');
                      expect(saga.id).to.eql(saga1.id);
                      expect(saga._commitStamp.getTime()).to.eql(saga1._commitStamp.getTime());
                      expect(saga._timeoutAt.getTime()).to.eql(saga1._timeoutAt.getTime());
                      expect(saga.data).to.eql(saga1.data);
                      done();
                    });

                  });

                });

                describe('calling getTimeoutedSagas', function () {

                  it('it should callback all the timeouted sagas', function (done) {

                    store.getTimeoutedSagas(function (err, sagas) {
                      expect(err).not.to.be.ok();
                      expect(sagas).to.be.an('array');
                      expect(sagas.length).to.eql(1);
                      expect(sagas[0].id).to.eql(saga2.id);
                      expect(sagas[0]._commitStamp.getTime()).to.eql(saga2._commitStamp.getTime());
                      expect(sagas[0]._timeoutAt.getTime()).to.eql(saga2._timeoutAt.getTime());
                      expect(sagas[0].data).to.eql(saga2.data);
                      done();
                    });

                  });

                });

                describe('calling getUndispatchedCommands', function () {

                  it('it should callback with the expected commands', function (done) {

                    store.getUndispatchedCommands(function (err, cmds) {
                      expect(err).not.to.be.ok();
                      expect(cmds).to.be.an('array');
                      expect(cmds.length).to.eql(4);
                      expect(cmds[0].sagaId).to.eql(saga1.id);
                      expect(cmds[0].commandId).to.eql(cmds1[0].id);
                      expect(cmds[0].commitStamp.getTime()).to.eql(saga1._commitStamp.getTime());
                      expect(cmds[0].command.id).to.eql(cmds1[0].payload.id);
                      expect(cmds[0].command.data).to.eql(cmds1[0].payload.data);
                      expect(cmds[1].sagaId).to.eql(saga2.id);
                      expect(cmds[1].commandId).to.eql(cmds2[0].id);
                      expect(cmds[1].commitStamp.getTime()).to.eql(saga2._commitStamp.getTime());
                      expect(cmds[1].command.id).to.eql(cmds2[0].payload.id);
                      expect(cmds[1].command.data).to.eql(cmds2[0].payload.data);
                      expect(cmds[2].sagaId).to.eql(saga2.id);
                      expect(cmds[2].commandId).to.eql(cmds2[1].id);
                      expect(cmds[2].commitStamp.getTime()).to.eql(saga2._commitStamp.getTime());
                      expect(cmds[2].command.id).to.eql(cmds2[1].payload.id);
                      expect(cmds[2].command.data).to.eql(cmds2[1].payload.data);
                      expect(cmds[3].sagaId).to.eql(saga3.id);
                      expect(cmds[3].commandId).to.eql(cmds3[0].id);
                      expect(cmds[3].commitStamp.getTime()).to.eql(saga3._commitStamp.getTime());
                      expect(cmds[3].command.id).to.eql(cmds3[0].payload.id);
                      expect(cmds[3].command.data).to.eql(cmds3[0].payload.data);

                      done();
                    });

                  });

                });

                describe('calling getOlderSagas', function () {

                  it('it should callback the expected sagas', function (done) {

                    store.getOlderSagas(new Date(2014, 3, 3), function (err, sagas) {
                      expect(err).not.to.be.ok();
                      expect(sagas).to.be.an('array');
                      expect(sagas.length).to.eql(2);
                      expect(sagas[0].id).to.eql(saga1.id);
                      expect(sagas[0]._commitStamp.getTime()).to.eql(saga1._commitStamp.getTime());
                      expect(sagas[0]._timeoutAt.getTime()).to.eql(saga1._timeoutAt.getTime());
                      expect(sagas[0].data).to.eql(saga1.data);
                      expect(sagas[1].id).to.eql(saga2.id);
                      expect(sagas[1]._commitStamp.getTime()).to.eql(saga2._commitStamp.getTime());
                      expect(sagas[1]._timeoutAt.getTime()).to.eql(saga2._timeoutAt.getTime());
                      expect(sagas[1].data).to.eql(saga2.data);

                      done();
                    });

                  });

                });

                describe('calling setCommandToDispatched', function () {

                  it('it should remove this command from store', function (done) {

                    store.setCommandToDispatched('cmdId2', 'sagaId2', function (err) {
                      expect(err).not.to.be.ok();

                      store.getUndispatchedCommands(function (err, cmds) {
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

                describe('calling remove', function () {

                  it('it should remove the requesting saga and its commands', function (done) {

                    store.remove('sagaId2', function (err) {
                      expect(err).not.to.be.ok();

                      store.get('sagaId2', function (err, saga) {
                        expect(err).not.to.be.ok();
                        expect(saga).to.eql(null);

                        store.getTimeoutedSagas(function (err, sagas) {
                          expect(err).not.to.be.ok();
                          expect(sagas).to.be.an('array');
                          expect(sagas.length).to.eql(0);

                          store.getOlderSagas(new Date(2314, 3, 17), function (err, sagas) {
                            expect(err).not.to.be.ok();
                            expect(sagas).to.be.an('array');
                            expect(sagas.length).to.eql(3);
                            expect(sagas[0].id).to.eql(saga1.id);
                            expect(sagas[0]._commitStamp.getTime()).to.eql(saga1._commitStamp.getTime());
                            expect(sagas[0]._timeoutAt.getTime()).to.eql(saga1._timeoutAt.getTime());
                            expect(sagas[0].data).to.eql(saga1.data);
                            expect(sagas[1].id).to.eql(saga3.id);
                            expect(sagas[1]._commitStamp.getTime()).to.eql(saga3._commitStamp.getTime());
                            expect(sagas[1].data).to.eql(saga3.data);
                            expect(sagas[2].id).to.eql(saga4.id);
                            expect(sagas[2]._commitStamp.getTime()).to.eql(saga4._commitStamp.getTime());
                            expect(sagas[2].data).to.eql(saga4.data);

                            store.getUndispatchedCommands(function (err, cmds) {
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

                describe('calling save', function () {

                  describe('but beeing updated by someone else in the meantime', function () {

                    it('it should callback with a concurrency error', function (done) {

                      store.get('sagaId4', function (err, saga) {
                        expect(err).not.to.be.ok();
                        var org = _.cloneDeep(saga);

                        saga.n = 'new';

                        store.save(saga, [], function (err) {
                          expect(err).not.to.be.ok();
                          org.n = 'other';
                          store.save(org, [], function (err) {
                            expect(err).to.be.a(ConcurrencyError);

                            done();
                          });
                        });
                      });

                    });

                  });

                  describe('but beeing updated by someone else in the meantime and creating with the same id', function() {

                    it('it should callback with a concurrency error', function (done) {

                      var s1 = { id: 'mySagaId', _commitStamp: new Date(2014, 3, 7), data: 'bla' };
                      var s2 = { id: 'mySagaId', _commitStamp: new Date(2014, 3, 7), data: 'bla2' };

                      store.save(s1, [], function (err) {
                        expect(err).not.to.be.ok();
                        store.save(s2, [], function (err) {
                          expect(err).to.be.a(ConcurrencyError);
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

      });

    });

  });

});
