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

        expect(saga.handle).to.be.a('function');

      });

    });

//    describe('handling an event', function () {
//
//      it('it should work as expected', function (done) {
//        var cmdObj = { my: 'command', with: { deep: 'value' }, aggregate: { id: 1234 } };
//        var clb = function () {};
//
//        var cmdHndFn = function (cmd, commandHandler, callback) {
//          expect(cmd).to.eql(cmdObj);
//          expect(commandHandler).to.eql(cmdHnd);
//          expect(clb).to.be.a('function');
//          done();
//        };
//
//        var cmdHnd = api.defineCommandHandler({ name: 'commandName', version: 3 }, cmdHndFn);
//
//        // dummy / mock stuff...
//        var agg = new Aggregate();
//        agg.validateCommand = function (cmd) {
//          return null;
//        };
//        cmdHnd.useAggregate(agg);
//        cmdHnd.useEventStore(eventStore);
//        cmdHnd.useAggregateLock(aggregateLock);
//
//        cmdHnd.handle(cmdObj, clb);
//      });
//
//    });

  });

});
