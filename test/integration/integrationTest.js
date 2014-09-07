var expect = require('expect.js'),
  api = require('../../index');

describe('integration', function () {

  var pm;

  before(function (done) {
    pm = api({ sagaPath: __dirname + '/fixture' });
    pm.defineCommand({
      id: 'id',
      meta: 'meta'
    });
    pm.defineEvent({
      name: 'name',
      context: 'context.name',
      aggregate: 'aggregate.name',
      version: 'version',
      meta: 'meta'
    });

    pm.init(done);
  });

  describe('handling an event that will not be handled', function () {

    it('it should not publish any command and it should callback without an error and without commands', function (done) {

      var publishedCommands = [];

      pm.onCommand(function (cmd) {
        publishedCommands.push(cmd);
      });

      var evt = {
        name: 'evtName',
        aggregate: {
          name: 'aggregate'
        },
        context: {
          name: 'context'
        },
        version: 0,
        meta: {
          userId: 'userId'
        }
      };

      pm.handle(evt, function (err, cmds, sagaModels) {
        expect(err).not.to.be.ok();
        expect(cmds).to.be.an('array');
        expect(cmds.length).to.eql(0);
        expect(sagaModels).to.be.an('array');
        expect(sagaModels.length).to.eql(0);
        expect(publishedCommands.length).to.eql(0);

        done();
      });

    });

  });

});
