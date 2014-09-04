var expect = require('expect.js'),
  async = require('async'),
  sagastore = require('../../lib/store'),
  Base = require('../../lib/store/base'),
  InMemory = require('../../lib/store/databases/inmemory');

describe('SagaStore', function() {

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

        var store = sagastore.create(InMemory);
        expect(store).to.be.a(InMemory);

      });

    });

    describe('with options containing a type property with the value of', function() {

      var types = ['inmemory'/*, 'mongodb', 'tingodb', 'redis', 'couchdb'*/];

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
                })

              });

            });

            describe('without a callback', function () {

              it('it should emit connect', function(done) {

                store = sagastore.create({ type: type });
                store.once('connect', done);
                store.connect()

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
                
                

              });

//              describe('having 3 reservations for an aggregate and 2 reservations with an other aggregate', function() {
//
//                beforeEach(function (done) {
//                  lock.clear(function () {
//                    async.series([
//                      function (callback) {
//                        setTimeout(function () {
//                          lock.reserve('workerId111', 'aggregateId111', callback);
//                        }, 1);
//                      },
//                      function (callback) {
//                        setTimeout(function () {
//                          lock.reserve('workerId222', 'aggregateId111', callback);
//                        }, 2);
//                      },
//                      function (callback) {
//                        setTimeout(function () {
//                          lock.reserve('workerId333', 'aggregateId111', callback);
//                        }, 3);
//                      },
//                      function (callback) {
//                        setTimeout(function () {
//                          lock.reserve('workerIdFirst', 'aggregateIdSecond', callback);
//                        }, 4);
//                      },
//                      function (callback) {
//                        setTimeout(function () {
//                          lock.reserve('workerIdSecond', 'aggregateIdSecond', callback);
//                        }, 5);
//                      }
//                    ], done);
//                  });
//                });
//
//                describe('calling getAll of the first aggregate', function () {
//
//                  it('it should callback with the correct amount of workers', function (done) {
//
//                    lock.getAll('aggregateId111', function (err, workerIds) {
//                      expect(err).not.to.be.ok();
//                      expect(workerIds).to.be.an('array');
//                      expect(workerIds.length).to.eql(3);
//                      expect(workerIds[0]).to.eql('workerId111');
//                      expect(workerIds[1]).to.eql('workerId222');
//                      expect(workerIds[2]).to.eql('workerId333');
//                      done();
//                    });
//                  });
//
//                });
//
//                describe('calling getAll of the second aggregate', function () {
//
//                  it('it should callback with the correct amount of workers', function (done) {
//
//                    lock.getAll('aggregateIdSecond', function (err, workerIds) {
//                      expect(err).not.to.be.ok();
//                      expect(workerIds).to.be.an('array');
//                      expect(workerIds.length).to.eql(2);
//                      expect(workerIds[0]).to.eql('workerIdFirst');
//                      expect(workerIds[1]).to.eql('workerIdSecond');
//                      done();
//                    });
//                  });
//
//                });
//
//                describe('calling resolve of the first aggregate', function() {
//
//                  it('it should have removed all reservation for this aggregate', function (done) {
//
//                    lock.resolve('aggregateId111', function (err, nothing) {
//                      expect(err).not.to.be.ok();
//                      expect(nothing).to.eql(undefined);
//
//                      lock.getAll('aggregateId111', function (err, workerIds) {
//                        expect(err).not.to.be.ok();
//                        expect(workerIds).to.be.an('array');
//                        expect(workerIds.length).to.eql(0);
//                        done();
//                      })
//                    })
//
//                  });
//
//                  it('it should not have removed any reservation for the other aggregate', function (done) {
//
//                    lock.resolve('aggregateId111', function (err, nothing) {
//                      expect(err).not.to.be.ok();
//                      expect(nothing).to.eql(undefined);
//
//                      lock.getAll('aggregateIdSecond', function (err, workerIds) {
//                        expect(err).not.to.be.ok();
//                        expect(workerIds).to.be.an('array');
//                        expect(workerIds.length).to.eql(2);
//                        expect(workerIds[0]).to.eql('workerIdFirst');
//                        expect(workerIds[1]).to.eql('workerIdSecond');
//                        done();
//                      })
//                    })
//
//                  });
//
//                });
//
//              });

            });

          });

        });

      });

    });

  });

});
