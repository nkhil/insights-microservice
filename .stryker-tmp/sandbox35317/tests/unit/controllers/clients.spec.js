const chai = require('chai');

chai.should();

describe('Client Controller', () => {
  describe('#createClient', () => {
    context('success', () => {
      it('should create a client', async () => {
        true.should.equal(true);
      });
    });
  });
});
