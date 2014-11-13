var expect = require('expect.js'),
  async = require('async'),
  revisionGuardStore = require('../../lib/revisionGuardStore'),
  Base = require('../../lib/revisionGuardStore/base'),
  InMemory = require('../../lib/revisionGuardStore/databases/inmemory');

describe('revisionGuardStore', function() {

  it('it should have the correct interface', function() {

    expect(revisionGuardStore).to.be.an('object');
    expect(revisionGuardStore.create).to.be.a('function');
    expect(revisionGuardStore.Store).to.eql(Base);

  });

  describe('calling create', function() {

    describe('without options', function() {

      it('it should return with the in memory store', function() {

        var store = revisionGuardStore.create();
        expect(store).to.be.a('object');

      });

      describe('but with a callback', function() {

        it('it should callback with store object', function(done) {

          revisionGuardStore.create(function(err, store) {
            expect(err).not.to.be.ok();
            expect(store).to.be.a('object');
            done();
          });

        });

      });

    });

    describe('with options of a non existing db implementation', function() {

      it('it should throw an error', function() {

        expect(function() {
          revisionGuardStore.create({ type: 'strangeDb' });
        }).to.throwError();

      });

      it('it should callback with an error', function(done) {

        expect(function() {
          revisionGuardStore.create({ type: 'strangeDb' }, function(err) {
            expect(err).to.be.ok();
            done();
          });
        }).to.throwError();

      });

    });

    describe('with options of an own db implementation', function() {

      it('it should return with the an instance of that implementation', function() {

        var store = revisionGuardStore.create(InMemory);
        expect(store).to.be.a(InMemory);

      });

    });

    describe('with options containing a type property with the value of', function() {

      var types = ['inmemory', 'azuretable', 'mongodb', 'tingodb', 'redis', 'couchdb'];

      types.forEach(function(type) {

        describe('"' + type + '"', function() {

          var store;

          describe('without callback', function() {

            afterEach(function(done) {
              store.disconnect(done);
            });

            it('it should return with the correct store', function() {

              store = revisionGuardStore.create({ type: type });
              expect(store).to.be.a('object');
              expect(store).to.be.a(Base);
              expect(store.connect).to.be.a('function');
              expect(store.disconnect).to.be.a('function');
              expect(store.getNewId).to.be.a('function');
              expect(store.get).to.be.a('function');
              expect(store.set).to.be.a('function');

            });

          });

          describe('with callback', function() {

            afterEach(function(done) {
              store.disconnect(done);
            });

            it('it should return with the correct store', function(done) {

              revisionGuardStore.create({ type: type }, function(err, resS) {
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

                store = revisionGuardStore.create({ type: type });
                store.connect(function (err) {
                  expect(err).not.to.be.ok();
                  done();
                });

              });

            });

            describe('without a callback', function () {

              it('it should emit connect', function(done) {

                store = revisionGuardStore.create({ type: type });
                store.once('connect', done);
                store.connect();

              });

            });

          });

          describe('having connected', function() {

            describe('calling disconnect', function() {

              beforeEach(function(done) {
                store = revisionGuardStore.create({ type: type });
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

            describe('using the store', function() {

              before(function(done) {
                store = revisionGuardStore.create({ type: type });
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

                  it('it should callback with an empty revision', function(done) {

                    store.get('23', function (err, rev) {
                      expect(err).not.to.be.ok();
                      expect(rev).not.to.be.ok();
                      done();
                    });

                  });

                });

                describe('calling set', function() {

                  it('it should work as expected', function(done) {

                    store.set('23', 5, 4, function (err) {
                      expect(err).not.to.be.ok();
                      
                      store.get('23', function (err, rev) {
                        expect(err).not.to.be.ok();
                        expect(rev).to.eql(5);

                        done();
                      });
                    });

                  });
                  
                  describe('with a current revision that is less than expected', function () {

                    it('it should callback with a ConcurrencyError', function(done) {

                      store.set('23', 6, 4, function (err) {
                        expect(err).to.be.ok();
                        expect(err.name).to.eql('ConcurrencyError');

                        store.get('23', function (err, rev) {
                          expect(err).not.to.be.ok();
                          expect(rev).to.eql(5);

                          done();
                        });
                      });

                    });
                    
                  });

                  describe('with a current revision that is greater than expected', function () {

                    it('it should callback with a ConcurrencyError', function(done) {

                      store.set('23', 6, 7, function (err) {
                        expect(err).to.be.ok();
                        expect(err.name).to.eql('ConcurrencyError');

                        store.get('23', function (err, rev) {
                          expect(err).not.to.be.ok();
                          expect(rev).to.eql(5);

                          done();
                        });
                      });

                    });

                  });

                  describe('with a current revision that is equal than expected', function () {

                    it('it should callback with a ConcurrencyError', function(done) {

                      store.set('23', 6, 6, function (err) {
                        expect(err).to.be.ok();
                        expect(err.name).to.eql('ConcurrencyError');

                        store.get('23', function (err, rev) {
                          expect(err).not.to.be.ok();
                          expect(rev).to.eql(5);

                          done();
                        });
                      });

                    });

                  });

                  describe('with a current revision that is null', function () {

                    it('it should callback without an error', function(done) {

                      store.set('2345', 2, null, function (err) {
                        expect(err).not.to.be.ok();

                        store.get('2345', function (err, rev) {
                          expect(err).not.to.be.ok();
                          expect(rev).to.eql(2);

                          done();
                        });
                      });

                    });

                  });

                  describe('with a current revision that is correct', function () {

                    it('it should callback without an error', function(done) {

                      store.set('23', 6, 5, function (err) {
                        expect(err).not.to.be.ok();

                        store.get('23', function (err, rev) {
                          expect(err).not.to.be.ok();
                          expect(rev).to.eql(6);

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
