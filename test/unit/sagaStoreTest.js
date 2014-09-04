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

                      store.get('123', function(err) {
                        expect(err).not.to.be.ok();
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

                  describe('with a valid date object', function () {

                    it('it should callback without an error', function (done) {

                      store.getOlderSagas(new Date(), function(err) {
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

                      store.save({ id: '1234', _commitStamp: new Date() }, [{ id: '234' }], function(err) {
                        expect(err).not.to.be.ok();
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

                      store.setCommandToDispatched('1234', '4356', function(err) {
                        expect(err).not.to.be.ok();
                        done();
                      });

                    });

                  });

                });

              });

              describe('having some saved sagas', function() {

                beforeEach(function (done) {
                  store.clear(function () {
                    async.series([
                      function (callback) {
                        setTimeout(function () {
                          store.save({ id: 'sagaId1', _commitStamp: new Date(2014, 3, 1), _timeoutAt: new Date(2014, 3, 17), data: 'sagaData1' }, [{ id: 'cmdId1', data: 'cmdData1' }], callback);
                        }, 1);
                      },
                      function (callback) {
                        setTimeout(function () {
                          store.save({ id: 'sagaId2', _commitStamp: new Date(2014, 3, 2), _timeoutAt: new Date(2014, 3, 15), data: 'sagaData2' }, [{ id: 'cmdId2', data: 'cmdData2' }, { id: 'cmdId22', data: 'cmdData22' }], callback);
                        }, 1);
                      },
                      function (callback) {
                        setTimeout(function () {
                          store.save({ id: 'sagaId3', _commitStamp: new Date(2014, 3, 5), data: 'sagaData3' }, [{ id: 'cmdId3', data: 'cmdData3' }], callback);
                        }, 1);
                      },
                      function (callback) {
                        setTimeout(function () {
                          store.save({ id: 'sagaId4', _commitStamp: new Date(2014, 3, 7), data: 'sagaData4' }, [], callback);
                        }, 1);
                      }
                    ], done);
                  });
                });

//                describe('calling ...');

              });

            });

          });

        });

      });

    });

  });

});
