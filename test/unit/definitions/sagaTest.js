var expect = require('expect.js'),
  _ = require('lodash'),
  DefinitionBase = require('../../../lib/definitionBase'),
  Saga = require('../../../lib/definitions/saga'),
  sagaStore = require('../../../lib/store').create(),
  api = require('../../../');

describe('saga definition', function () {

  describe('creating a new saga definition', function () {

    describe('without any arguments', function () {

      it('it should throw an error', function () {

        expect(function () {
          api.defineSaga();
        }).to.throwError(/function/);

      });

    });

    describe('without saga function', function () {

      it('it should throw an error', function () {

        expect(function () {
          api.defineSaga(null);
        }).to.throwError(/function/);

      });

    });

    describe('with a wrong saga function', function () {

      it('it should throw an error', function () {

        expect(function () {
          api.defineSaga(null, 'not a function');
        }).to.throwError(/function/);

      });

    });

    describe('with a correct saga function', function () {

      it('it should not throw an error', function () {

        expect(function () {
          api.defineSaga(null, function () {});
        }).not.to.throwError();

      });

      it('it should return a correct object', function () {

        var sagaFn = function () {};
        var saga = api.defineSaga(null, sagaFn);
        expect(saga).to.be.a(DefinitionBase);
        expect(saga).to.be.a(Saga);
        expect(saga.sagaFn).to.eql(sagaFn);
        expect(saga.definitions).to.be.an('object');
        expect(saga.definitions.command).to.be.an('object');
        expect(saga.definitions.event).to.be.an('object');
        expect(saga.defineCommand).to.be.a('function');
        expect(saga.defineEvent).to.be.a('function');
        expect(saga.defineOptions).to.be.a('function');

        expect(saga.handle).to.be.a('function');
        expect(saga.useAsId).to.be.a('function');

      });

    });

    describe('with some meta infos and a correct saga function', function () {

      it('it should not throw an error', function () {

        expect(function () {
          api.defineSaga({ name: 'eventName', version: 3 }, function () {});
        }).not.to.throwError();

      });

      it('it should return a correct object', function () {

        var sagaFn = function () {};
        var saga = api.defineSaga({ name: 'commandName', version: 3 }, sagaFn);
        expect(saga).to.be.a(DefinitionBase);
        expect(saga).to.be.a(Saga);
        expect(saga.sagaFn).to.eql(sagaFn);
        expect(saga.definitions).to.be.an('object');
        expect(saga.definitions.command).to.be.an('object');
        expect(saga.definitions.event).to.be.an('object');
        expect(saga.defineCommand).to.be.a('function');
        expect(saga.defineEvent).to.be.a('function');
        expect(saga.defineOptions).to.be.a('function');

        expect(saga.idGenerator).to.be.a('function');
        expect(saga.handle).to.be.a('function');
        expect(saga.useSagaStore).to.be.a('function');

      });

    });

    describe('defining an id generator function', function() {

      var saga;

      beforeEach(function () {
        var sagaFn = function () {};
        saga = api.defineSaga({ name: 'eventName', version: 3 }, sagaFn);
        saga.getNewId = null;
      });

      describe('in a synchronous way', function() {

        it('it should be transformed internally to an asynchronous way', function(done) {

          saga.idGenerator(function () {
            var id = require('node-uuid').v4().toString();
            return id;
          });

          saga.getNewId(function (err, id) {
            expect(id).to.be.a('string');
            done();
          });

        });

      });

      describe('in an synchronous way', function() {

        it('it should be taken as it is', function(done) {

          saga.idGenerator(function (callback) {
            setTimeout(function () {
              var id = require('node-uuid').v4().toString();
              callback(null, id);
            }, 10);
          });

          saga.getNewId(function (err, id) {
            expect(id).to.be.a('string');
            done();
          });

        });

      });

    });

    describe('defining an use as id function', function() {

      var saga;

      beforeEach(function () {
        var sagaFn = function () {};
        saga = api.defineSaga({ name: 'eventName', version: 3 }, sagaFn);
        saga.getNewIdForThisSaga = null;
      });

      describe('in a synchronous way', function() {

        it('it should be transformed internally to an asynchronous way', function(done) {

          saga.useAsId(function (evt) {
            expect(evt.my).to.eql('evt');
            var id = require('node-uuid').v4().toString();
            return id;
          });

          saga.getNewIdForThisSaga({ my: 'evt' }, function (err, id) {
            expect(id).to.be.a('string');
            done();
          });

        });

      });

      describe('in an synchronous way', function() {

        it('it should be taken as it is', function(done) {

          saga.useAsId(function (evt, callback) {
            expect(evt.my).to.eql('evt');
            setTimeout(function () {
              var id = require('node-uuid').v4().toString();
              callback(null, id);
            }, 10);
          });

          saga.getNewIdForThisSaga({ my: 'evt' }, function (err, id) {
            expect(id).to.be.a('string');
            done();
          });

        });

      });

    });

    describe('handling an event', function () {
      
      var saga;
      
      before(function (done) {
        sagaStore.connect(done);
      });
      
      describe('in a saga', function () {

        describe('that defines containsProperties', function () {

          describe('not matching', function () {

            it('it should work as expected', function (done) {
              var sagaFn = function () {};
              saga = api.defineSaga({
                name: 'eventName',
                version: 3,
                payload: 'p',
                containingProperties: ['aggId']
              }, sagaFn);

              saga.useSagaStore(sagaStore);

              saga.handle({}, function (err, sagaModel) {
                expect(err).not.to.be.ok();
                expect(sagaModel).not.to.be.ok();
                done();
              });
            });

          });

          describe('matching', function () {

            it('it should work as expected', function (done) {
              
              var fnCalled = false;
              var sagaId = null;
              var sagaFn = function (e, s, clb) {
                expect(e.aggId).to.eql('123');
                expect(s.id).to.be.a('string');
                sagaId = s.id;
                fnCalled = true;
                clb(null);
              };
              saga = api.defineSaga({
                name: 'eventName',
                version: 3,
                containingProperties: ['aggId']
              }, sagaFn);

              saga.useSagaStore(sagaStore);

              saga.handle({ aggId: '123' }, function (err, sagaModel) {
                expect(err).not.to.be.ok();
                expect(sagaModel.id).to.eql(sagaId);
                expect(fnCalled).to.eql(true);
                done();
              });
            });

          });

        });

        describe('that does not define containProperties', function () {
          
          describe('having defined an id', function () {

            it('it should it as saga id', function (done) {

              var fnCalled = false;
              var sagaFn = function (e, s, clb) {
                expect(e.aggId).to.eql('123');
                expect(s.id).to.eql('123');
                fnCalled = true;
                clb(null);
              };
              saga = api.defineSaga({
                name: 'eventName',
                version: 3,
                id: 'aggId'
              }, sagaFn);

              saga.useSagaStore(sagaStore);

              saga.handle({ aggId: '123' }, function (err, sagaModel) {
                expect(err).not.to.be.ok();
                expect(sagaModel.id).to.eql('123');
                expect(fnCalled).to.eql(true);
                done();
              });
            });
            
          });

          describe('having an existing saga', function () {
            
            before(function (done) {
              sagaStore.save({ id: '5647', _commitStamp: new Date(), my: 'data' }, [], done);
            });

            it('it should use the existing data in the saga', function (done) {

              var fnCalled = false;
              var sagaFn = function (e, s, clb) {
                expect(e.aggId).to.eql('5647');
                expect(s.id).to.eql('5647');
                expect(s.get('my')).to.eql('data');
                s.set('new', 'value');
                fnCalled = true;
                clb(null);
              };
              saga = api.defineSaga({
                name: 'eventName',
                version: 3,
                id: 'aggId'
              }, sagaFn);

              saga.useSagaStore(sagaStore);

              saga.handle({ aggId: '5647' }, function (err, sagaModel) {
                expect(err).not.to.be.ok();
                expect(sagaModel.id).to.eql('5647');
                expect(sagaModel.get('my')).to.eql('data');
                expect(sagaModel.get('new')).to.eql('value');
                expect(fnCalled).to.eql(true);
                done();
              });
            });

          });

          describe('calling saga.addCommandToSend in the handle function', function () {

            it('it should work as expected', function (done) {

              var fnCalled = false;
              var sagaFn = function (e, s, clb) {
                expect(e.aggId).to.eql('5647');
                expect(s.id).to.eql('5647');
                s.addCommandToSend({ c: 'data1' });
                s.addCommandToSend({ c: 'data2', meta: 'm' });
                fnCalled = true;
                clb(null);
              };
              saga = api.defineSaga({
                name: 'eventName',
                version: 3,
                id: 'aggId'
              }, sagaFn);
              saga.defineCommand({
                id: 'id',
                meta: 'meta'
              });
              saga.defineEvent({
                id: 'id',
                meta: 'meta'
              });

              saga.useSagaStore(sagaStore);

              saga.handle({ aggId: '5647', meta: 'evtMeta' }, function (err, sagaModel) {
                expect(err).not.to.be.ok();
                expect(sagaModel.id).to.eql('5647');
                var cmds = sagaModel.getUndispatchedCommands();
                expect(cmds.length).to.eql(2);
                expect(cmds[0].c).to.eql('data1');
                expect(cmds[0].meta).to.eql('evtMeta');
                expect(cmds[1].c).to.eql('data2');
                expect(cmds[1].meta).to.eql('m');
                expect(fnCalled).to.eql(true);
                done();
              });
            });

          });

          describe('calling saga.defineTimeout in the handle function', function () {

            describe('without command', function () {

              it('it should work as expected', function (done) {

                var fnCalled = false;
                var sagaFn = function (e, s, clb) {
                  expect(e.aggId).to.eql('5647');
                  expect(s.id).to.eql('5647');
                  s.defineTimeout(new Date(2034, 8, 25));
                  fnCalled = true;
                  clb(null);
                };
                saga = api.defineSaga({
                  name: 'eventName',
                  version: 3,
                  id: 'aggId'
                }, sagaFn);
                saga.defineCommand({
                  id: 'id',
                  meta: 'meta'
                });
                saga.defineEvent({
                  id: 'id',
                  meta: 'meta'
                });

                saga.useSagaStore(sagaStore);

                saga.handle({ aggId: '5647', meta: 'evtMeta' }, function (err, sagaModel) {
                  expect(err).not.to.be.ok();
                  expect(sagaModel.id).to.eql('5647');
                  var cmds = sagaModel.getTimeoutCommands();
                  expect(cmds.length).to.eql(0);
                  var timeout = sagaModel.getTimeoutAt();
                  expect(timeout.getTime()).to.eql((new Date(2034, 8, 25)).getTime());
                  expect(fnCalled).to.eql(true);
                  done();
                });
              });
              
            });

            describe('with one command', function () {

              it('it should work as expected', function (done) {

                var fnCalled = false;
                var sagaFn = function (e, s, clb) {
                  expect(e.aggId).to.eql('5647');
                  expect(s.id).to.eql('5647');
                  s.defineTimeout(new Date(2034, 8, 23), { c: 'data1' });
                  fnCalled = true;
                  clb(null);
                };
                saga = api.defineSaga({
                  name: 'eventName',
                  version: 3,
                  id: 'aggId'
                }, sagaFn);
                saga.defineCommand({
                  id: 'id',
                  meta: 'meta'
                });
                saga.defineEvent({
                  id: 'id',
                  meta: 'meta'
                });

                saga.useSagaStore(sagaStore);

                saga.handle({ aggId: '5647', meta: 'evtMeta' }, function (err, sagaModel) {
                  expect(err).not.to.be.ok();
                  expect(sagaModel.id).to.eql('5647');
                  var cmds = sagaModel.getTimeoutCommands();
                  expect(cmds.length).to.eql(1);
                  expect(cmds[0].c).to.eql('data1');
                  expect(cmds[0].meta).to.eql('evtMeta');
                  var timeout = sagaModel.getTimeoutAt();
                  expect(timeout.getTime()).to.eql((new Date(2034, 8, 23)).getTime());
                  expect(fnCalled).to.eql(true);
                  done();
                });
              });

            });

            describe('with mutliple commands', function () {

              it('it should work as expected', function (done) {

                var fnCalled = false;
                var sagaFn = function (e, s, clb) {
                  expect(e.aggId).to.eql('5647');
                  expect(s.id).to.eql('5647');
                  s.defineTimeout(new Date(2034, 8, 27), [{ c: 'data1' }, { c: 'data2', meta: 'm' }]);
                  fnCalled = true;
                  clb(null);
                };
                saga = api.defineSaga({
                  name: 'eventName',
                  version: 3,
                  id: 'aggId'
                }, sagaFn);
                saga.defineCommand({
                  id: 'id',
                  meta: 'meta'
                });
                saga.defineEvent({
                  id: 'id',
                  meta: 'meta'
                });

                saga.useSagaStore(sagaStore);

                saga.handle({ aggId: '5647', meta: 'evtMeta' }, function (err, sagaModel) {
                  expect(err).not.to.be.ok();
                  expect(sagaModel.id).to.eql('5647');
                  var cmds = sagaModel.getTimeoutCommands();
                  expect(cmds.length).to.eql(2);
                  expect(cmds[0].c).to.eql('data1');
                  expect(cmds[0].meta).to.eql('evtMeta');
                  expect(cmds[1].c).to.eql('data2');
                  expect(cmds[1].meta).to.eql('m');
                  var timeout = sagaModel.getTimeoutAt();
                  expect(timeout.getTime()).to.eql((new Date(2034, 8, 27)).getTime());
                  expect(fnCalled).to.eql(true);
                  done();
                });
              });

            });

          });

          describe('calling saga.commit in the handle function', function () {

            describe('having destroyed the saga', function () {

              before(function (done) {
                sagaStore.save({ id: '9361', _commitStamp: new Date(), my: 'data' }, [], done);
              });

              it('it should work as expected', function (done) {

                var fnCalled = false;
                var sagaFn = function (e, s, clb) {
                  expect(e.aggId).to.eql('9361');
                  expect(s.id).to.eql('9361');
                  s.destroy();
                  fnCalled = true;
                  s.commit(clb);
                };
                saga = api.defineSaga({
                  name: 'eventName',
                  version: 3,
                  id: 'aggId'
                }, sagaFn);

                saga.useSagaStore(sagaStore);

                saga.handle({ aggId: '9361', meta: 'evtMeta' }, function (err, sagaModel) {
                  expect(err).not.to.be.ok();
                  expect(sagaModel.id).to.eql('9361');
                  expect(sagaModel.isDestroyed()).to.eql(true);
                  expect(fnCalled).to.eql(true);

                  sagaStore.get('9361', function (err, saga) {
                    expect(err).not.to.be.ok();
                    expect(saga).not.to.be.ok();
                    done();
                  });
                });
              });
              
            });

            describe('with some commands and data and timeout stuff', function () {

              it('it should work as expected', function (done) {

                var sagaId;
                var fnCalled = false;
                var sagaFn = function (e, s, clb) {
                  expect(e.aggId).to.eql('5647');
                  expect(s.id).to.be.a('string');
                  sagaId = s.id;
                  s.addCommandToSend({ cS: 'data1S' });
                  s.addCommandToSend({ cS: 'data2S', meta: 'mS' });
                  s.defineTimeout(new Date(2034, 8, 27), [{ c: 'data1' }, { c: 'data2', meta: 'm' }]);
                  fnCalled = true;
                  s.commit(clb);
                };
                saga = api.defineSaga({
                  name: 'eventName',
                  version: 3
                }, sagaFn);
                saga.defineCommand({
                  id: 'id',
                  meta: 'meta'
                });
                saga.defineEvent({
                  id: 'id',
                  meta: 'meta'
                });

                saga.useSagaStore(sagaStore);

                saga.handle({ aggId: '5647', meta: 'evtMeta' }, function (err, sagaModel) {
                  expect(err).not.to.be.ok();
                  expect(sagaModel.id).to.eql(sagaId);
                  var cmdsT = sagaModel.getTimeoutCommands();
                  expect(cmdsT.length).to.eql(2);
                  expect(cmdsT[0].c).to.eql('data1');
                  expect(cmdsT[0].meta).to.eql('evtMeta');
                  expect(cmdsT[1].c).to.eql('data2');
                  expect(cmdsT[1].meta).to.eql('m');
                  var timeout = sagaModel.getTimeoutAt();
                  expect(timeout.getTime()).to.eql((new Date(2034, 8, 27)).getTime());

                  var cmds = sagaModel.getUndispatchedCommands();
                  expect(cmds.length).to.eql(2);
                  expect(cmds[0].cS).to.eql('data1S');
                  expect(cmds[0].meta).to.eql('evtMeta');
                  expect(cmds[1].cS).to.eql('data2S');
                  expect(cmds[1].meta).to.eql('mS');
                  
                  expect(fnCalled).to.eql(true);
                  
                  sagaStore.get(sagaId, function (err, saga) {
                    expect(err).not.to.be.ok();
                    expect(saga).to.be.an('object');
                    expect(saga.id).to.eql(sagaId);
                    var cmdsT = saga._timeoutCommands;
                    expect(cmdsT.length).to.eql(2);
                    expect(cmdsT[0].c).to.eql('data1');
                    expect(cmdsT[0].meta).to.eql('evtMeta');
                    expect(cmdsT[1].c).to.eql('data2');
                    expect(cmdsT[1].meta).to.eql('m');
                    var timeout = saga._timeoutAt;
                    expect(timeout.getTime()).to.eql((new Date(2034, 8, 27)).getTime());

                    done();
                  });
                });
              });

            });

          });

          describe('defining a payload', function () {

            it('it should work as expected', function (done) {

              var fnCalled = false;
              var sagaFn = function (e, s, clb) {
                expect(e).to.eql('abc');
                expect(s.id).to.be.a('string');
                fnCalled = true;
                clb(null);
              };
              saga = api.defineSaga({
                name: 'eventName',
                version: 3,
                payload: 'path'
              }, sagaFn);

              saga.useSagaStore(sagaStore);

              saga.handle({ aggId: '213', meta: 'evtMeta', path: 'abc' }, function (err, sagaModel) {
                expect(err).not.to.be.ok();
                expect(sagaModel.id).to.be.a('string');
                expect(fnCalled).to.eql(true);
                done();
              });
            });

          });
          
          describe('defining existing true', function () {

            describe('not having an existing', function () {

              it('it should work as expected', function (done) {

                var fnCalled = false;
                var sagaFn = function (e, s, clb) {
                  expect(e).to.eql('abc');
                  expect(s.id).to.be.a('string');
                  fnCalled = true;
                  clb(null);
                };
                saga = api.defineSaga({
                  name: 'eventName',
                  version: 3,
                  payload: 'path',
                  existing: true,
                  id: 'aggId'
                }, sagaFn);

                saga.useSagaStore(sagaStore);

                saga.handle({ aggId: '9876', meta: 'evtMeta', path: 'abc' }, function (err, sagaModel) {
                  expect(err).not.to.be.ok();
                  expect(fnCalled).to.eql(false);
                  expect(sagaModel).not.to.be.ok();
                  done();
                });
              });

            });

            describe('having an existing', function () {
              
              before(function (done) {
                sagaStore.save({ id: '182734', _commitStamp: new Date() }, [], done);
              });

              it('it should work as expected', function (done) {

                var fnCalled = false;
                var sagaFn = function (e, s, clb) {
                  expect(e).to.eql('abc');
                  expect(s.id).to.be.a('string');
                  fnCalled = true;
                  clb(null);
                };
                saga = api.defineSaga({
                  name: 'eventName',
                  version: 3,
                  payload: 'path',
                  existing: true,
                  id: 'aggId'
                }, sagaFn);

                saga.useSagaStore(sagaStore);

                saga.handle({ aggId: '182734', meta: 'evtMeta', path: 'abc' }, function (err, sagaModel) {
                  expect(err).not.to.be.ok();
                  expect(fnCalled).to.eql(true);
                  expect(sagaModel.id).to.eql('182734');
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
