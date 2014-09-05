var expect = require('expect.js'),
  SagaModel = require('../../lib/sagaModel');

describe('saga model', function () {

  describe('creating a new instance', function () {

    describe('without any arguments', function () {

      it('it should throw an error', function () {

        expect(function () {
          new SagaModel();
        }).to.throwError(/id/);

      });

    });

    describe('with an id as number', function () {

      it('it should throw an error', function () {

        expect(function () {
          new SagaModel(1234);
        }).to.throwError(/id/);

      });

    });

    describe('with an id as string', function () {

      it('it should not throw an error', function () {

        expect(function () {
          new SagaModel('12345');
        }).not.to.throwError();

      });

      it('it should return a correct object', function() {

        var saga = new SagaModel('1234');

        expect(saga).to.be.an('object');
        expect(saga.set).to.be.a('function');
        expect(saga.get).to.be.a('function');
        expect(saga.has).to.be.a('function');
        expect(saga.toJSON).to.be.a('function');
        expect(saga.destroy).to.be.a('function');
        expect(saga.isDestroyed).to.be.a('function');
        expect(saga.setCommitStamp).to.be.a('function');
        expect(saga.getCommitStamp).to.be.a('function');
        expect(saga.addTimeout).to.be.a('function');
        expect(saga.getTimeoutAt).to.be.a('function');
        expect(saga.getTimeoutCommands).to.be.a('function');
        expect(saga.addUnsentCommand).to.be.a('function');
        expect(saga.removeUnsentCommand).to.be.a('function');
        expect(saga.getUndispatchedCommands).to.be.a('function');

        expect(saga.id).to.eql('1234');
        expect(saga.get('id')).to.eql('1234');

      });

    });

    describe('calling has', function() {

      describe('of an attribute that does exist', function() {

        it('it should return true', function() {

          var saga = new SagaModel('123456');
          saga.set('a', 'b');

          expect(saga.has('id')).to.eql(true);
          expect(saga.has('a')).to.eql(true);

        });

      });

      describe('of an attribute that does not exist', function() {

        it('it should return false', function() {

          var saga = new SagaModel('123456');

          expect(saga.has('data222')).to.eql(false);

        });

      });

    });

    describe('calling get', function() {

      describe('of an attribute that does exist', function() {

        it('it should return that value', function() {

          var saga = new SagaModel('123456');
          saga.set('my', 'data');

          expect(saga.get('my')).to.eql('data');

        });

      });

      describe('of an attribute that does not exist', function() {

        it('it should return undefined', function() {

          var saga = new SagaModel('123456');

          expect(saga.get('data222')).to.eql(undefined);

        });

      });

      describe('of an attribute that is deep', function() {

        it('it should return that value', function() {

          var saga = new SagaModel('123456');
          saga.set('deep', { data: 'other stuff' });

          expect(saga.get('deep.data')).to.eql('other stuff');

        });

      });

    });

    describe('calling set', function() {

      describe('with a simple key', function() {

        it('it should set it correctly', function() {

          var saga = new SagaModel('123456');

          saga.set('data', 'a');
          expect(saga.get('data')).to.eql('a');

        });

      });

      describe('with a path as key', function() {

        it('it should set it correctly', function() {

          var saga = new SagaModel('123456');

          saga.set('path.sub', 'b');
          expect(saga.get('path.sub')).to.eql('b');

        });

      });

      describe('with an object', function() {

        it('it should set it correctly', function() {

          var saga = new SagaModel('123456');

          saga.set({ tree: 'a', bee: { oh: '3' } });
          expect(saga.get('tree')).to.eql('a');
          expect(saga.get('bee.oh')).to.eql('3');

        });

      });

    });

    describe('calling toJSON', function() {

      it('it should return all attributes as Javascript object', function() {

        var saga = new SagaModel('123456');
        saga.set('data', 'other stuff');
        saga.set('deeper', { a: 'b' });
        
        saga.setCommitStamp(new Date(2014, 3, 17));
        saga.addTimeout(new Date(2014, 3, 2), [{ id: '321' }, { id: '432' }]);
        
        var json = saga.toJSON();

        expect(json.id).to.eql('123456');
        expect(json.data).to.eql('other stuff');
        expect(json.deeper.a).to.eql('b');
        expect(json._commitStamp.getTime()).to.eql((new Date(2014, 3, 17)).getTime());
        expect(json._timeoutAt.getTime()).to.eql((new Date(2014, 3, 2)).getTime());
        expect(json._timeoutCommands).to.be.an('array');
        expect(json._timeoutCommands.length).to.eql(2);
        expect(json._timeoutCommands[0].id).to.eql('321');
        expect(json._timeoutCommands[1].id).to.eql('432');

      });

    });

    describe('calling destroy', function() {

      it('it should mark the vm as to be deleted', function() {

        var saga = new SagaModel('123456');

        expect(saga.isDestroyed()).to.eql(false);

        saga.destroy();

        expect(saga.isDestroyed()).to.eql(true);

      });

    });

    describe('mark saga as destroyed', function () {

      it('it should work as expected', function () {

        var saga = new SagaModel('1234456745');

        expect(saga.isDestroyed()).to.eql(false);

        saga.destroy();

        expect(saga.isDestroyed()).to.eql(true);

      });

    });
    
    describe('working with unsent commands', function () {
      
      it('it should work as expected', function () {
        
        var saga = new SagaModel('1234');
        var cmds = saga.getUndispatchedCommands();
        
        expect(cmds).to.be.an('array');
        expect(cmds.length).to.eql(0);
        
        var first = { id: '13334' };
        saga.addUnsentCommand(first);
        saga.addUnsentCommand({ id: '22114' });
        cmds = saga.getUndispatchedCommands();

        expect(cmds).to.be.an('array');
        expect(cmds.length).to.eql(2);
        expect(cmds[0].id).to.eql('13334');
        expect(cmds[1].id).to.eql('22114');
        
        saga.removeUnsentCommand(first);
        cmds = saga.getUndispatchedCommands();

        expect(cmds).to.be.an('array');
        expect(cmds.length).to.eql(1);
        expect(cmds[0].id).to.eql('22114');
        
      });
      
    });

    describe('working with commitStamp', function () {

      it('it should work as expected', function () {

        var saga = new SagaModel('1234');
        var stamp = saga.getCommitStamp();

        expect(stamp).not.to.be.ok();
        
        saga.setCommitStamp(new Date(2014, 2, 5));
        
        stamp = saga.getCommitStamp();

        expect(stamp.getTime()).to.eql((new Date(2014, 2, 5)).getTime());

      });

    });

    describe('working with timeout', function () {

      it('it should work as expected', function () {

        var saga = new SagaModel('1234');
        var timeout = saga.getTimeoutAt();
        var cmds = saga.getTimeoutCommands();

        expect(timeout).not.to.be.ok();
        expect(cmds).not.to.be.ok();

        saga.addTimeout(new Date(2014, 1, 15), [{ id: '111' }, { id: '222' }]);
        timeout = saga.getTimeoutAt();
        cmds = saga.getTimeoutCommands();

        expect(timeout.getTime()).to.eql((new Date(2014, 1, 15)).getTime());
        expect(cmds).to.be.an('array');
        expect(cmds.length).to.eql(2);
        expect(cmds[0].id).to.eql('111');
        expect(cmds[1].id).to.eql('222');

      });

    });

  });

});
