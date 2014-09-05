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

    describe('handling an event', function () {
      
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

//        describe('that does not define containProperties');

      });
      

    });

  });

});
