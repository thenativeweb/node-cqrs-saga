var expect = require('expect.js'),
  _ = require('lodash'),
  DefinitionBase = require('../../../lib/definitionBase');

describe('base definition', function () {

  describe('creating a new definition', function () {

    it('it should not throw an error', function () {

      expect(function () {
        new DefinitionBase();
      }).not.to.throwError();

    });

    it('it should return a correct object', function () {

      var def = new DefinitionBase();
      expect(def.definitions).to.be.an('object');
      expect(def.definitions.command).to.be.an('object');
      expect(def.definitions.event).to.be.an('object');
      expect(def.defineCommand).to.be.a('function');
      expect(def.defineEvent).to.be.a('function');
      expect(def.defineOptions).to.be.a('function');

    });

    describe('passing a name in meta infos', function () {

      it('it should return a correct object', function () {

        var def = new DefinitionBase({ name: 'myName' });
        expect(def.name).to.eql('myName');
        expect(def.definitions).to.be.an('object');
        expect(def.definitions.command).to.be.an('object');
        expect(def.definitions.event).to.be.an('object');
        expect(def.defineCommand).to.be.a('function');
        expect(def.defineEvent).to.be.a('function');
        expect(def.defineOptions).to.be.a('function');

      });

    });

    describe('defining options', function() {

      var def;

      beforeEach(function () {
        def = new DefinitionBase({ name: 'myName' });
      });

      it('it should work as expected', function() {

        def.defineOptions({
          my: 'options',
          of: {
            some: 'deep'
          }
        });

        expect(def.options.my).to.eql('options');
        expect(def.options.of.some).to.eql('deep');

      });

    });

    describe('defining the command structure', function() {

      var def;

      beforeEach(function () {
        def = new DefinitionBase({ name: 'myName' });
      });

      describe('using the defaults', function () {

        it('it should apply the defaults', function() {

          var defaults = _.cloneDeep(def.definitions.command);

          def.defineCommand({
            meta: 'pass'
          });

          expect(defaults.id).to.eql(def.definitions.command.id);
          expect(def.definitions.command.meta).to.eql('pass');
          expect(defaults.meta).not.to.eql(def.definitions.command.meta);

        });

      });

      describe('overwriting the defaults', function () {

        it('it should apply them correctly', function() {

          var defaults = _.cloneDeep(def.definitions.command);

          def.defineCommand({
            id: 'commandId',
            meta: 'pass'
          });

          expect(def.definitions.command.id).to.eql('commandId');
          expect(defaults.id).not.to.eql(def.definitions.command.id);
          expect(def.definitions.command.meta).to.eql('pass');
          expect(defaults.meta).not.to.eql(def.definitions.command.meta);

        });

      });

    });

    describe('defining the event structure', function() {

      var def;

      beforeEach(function () {
        def = new DefinitionBase({ name: 'myName' });
      });

      describe('using the defaults', function () {

        it('it should apply the defaults', function() {

          var defaults = _.cloneDeep(def.definitions.event);

          def.defineEvent({
            aggregate: 'aggName',
            context: 'ctx.Name',
            version: 'v.',
            meta: 'pass'
          });

          expect(defaults.name).to.eql(def.definitions.event.name);
          expect(def.definitions.event.aggregate).to.eql('aggName');
          expect(defaults.aggregate).not.to.eql(def.definitions.event.aggregate);
          expect(def.definitions.event.context).to.eql('ctx.Name');
          expect(defaults.context).not.to.eql(def.definitions.event.context);
          expect(def.definitions.event.version).to.eql('v.');
          expect(defaults.version).not.to.eql(def.definitions.event.version);
          expect(def.definitions.event.meta).to.eql('pass');
          expect(defaults.meta).not.to.eql(def.definitions.event.meta);

        });

      });

      describe('overwriting the defaults', function () {

        it('it should apply them correctly', function() {

          var defaults = _.cloneDeep(def.definitions.event);

          def.defineEvent({
            id: 'eventId',
            name: 'defName',
            aggregate: 'aggName',
            context: 'ctx.Name',
            version: 'v.',
            meta: 'pass'
          });

          expect(def.definitions.event.name).to.eql('defName');
          expect(defaults.name).not.to.eql(def.definitions.event.name);
          expect(def.definitions.event.aggregate).to.eql('aggName');
          expect(defaults.aggregate).not.to.eql(def.definitions.event.aggregate);
          expect(def.definitions.event.context).to.eql('ctx.Name');
          expect(defaults.context).not.to.eql(def.definitions.event.context);
          expect(def.definitions.event.version).to.eql('v.');
          expect(defaults.version).not.to.eql(def.definitions.event.version);
          expect(def.definitions.event.meta).to.eql('pass');
          expect(defaults.meta).not.to.eql(def.definitions.event.meta);

        });

      });

    });

  });

});
