var expect = require('expect.js'),
  OrderQueue = require('../../lib/orderQueue');

describe('orderQueue', function () {

  describe('creating a new instance', function () {
    
    var queue;

    it('it should not throw an error', function () {

      expect(function () {
        queue = new OrderQueue({ queueTimeout: 50 });
        expect(queue.options.queueTimeout).to.eql(50);
      }).not.to.throwError();

    });

    describe('having a clean queue', function() {

      before(function () {
        queue.clear();
      });

      describe('calling get', function () {

        it('it should return null', function () {

          expect(function () {
            var res = queue.get('aggId1324234');
            expect(res).to.eql(null);
          }).not.to.throwError();

        });

      });

      describe('calling remove', function () {

        it('it should not throw an error', function () {

          expect(function () {
            queue.remove('aggId123', 'objId1234');
          }).not.to.throwError();

        });

      });

      describe('calling push', function () {

        it('it should work as expected', function () {

          expect(function () {
            function evtClb () {}
            function timeoutFn () {}
            queue.push('aggId5132', 'objId151452', { ev: 'ent' }, evtClb, timeoutFn);
            
            var res = queue.get('aggId5132');
            expect(res).to.be.an('array');
            expect(res.length).to.eql(1);
            expect(res[0].payload.ev).to.eql('ent');
            expect(res[0].callback).to.eql(evtClb);
            expect(res[0].id).to.eql('objId151452');
            
            queue.remove('aggId5132', 'wrong');
            var res = queue.get('aggId5132');
            expect(res).to.be.an('array');
            expect(res.length).to.eql(1);
            expect(res[0].payload.ev).to.eql('ent');
            expect(res[0].callback).to.eql(evtClb);
            expect(res[0].id).to.eql('objId151452');
            
            queue.remove('aggId5132', 'objId151452');
            var res = queue.get('aggId5132');
            expect(res).to.eql(null);  
          }).not.to.throwError();

        });
        
        describe('waiting too long before remove it', function () {
          
          it('it should work as expected', function (done) {

            function evtClb () {}
            var loopCounts = [];
            function timeoutFn (loopCount, wait) {
              loopCounts.push(loopCount);
              wait();
            }
            queue.push('aggId5132', 'objId151452', { ev: 'ent' }, evtClb, timeoutFn);
            setTimeout(function () {
              queue.remove('aggId5132', 'objId151452');
              
              setTimeout(function () {
                expect(loopCounts.length).to.eql(3);
                expect(loopCounts[0]).to.eql(1);
                expect(loopCounts[1]).to.eql(2);
                expect(loopCounts[2]).to.eql(3);
                done();
              }, 60);
            }, 160);
            
          });
          
        });

      });

    });

  });

});
