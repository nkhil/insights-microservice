const chai = require('chai');
const { Decline } = require('../../../src/models/decline');

chai.should();

describe('Decline model', () => {
  beforeEach(() => {
    this.decline = new Decline();
  });

  describe('Build decline with all relevant attributes', () => {
    it('should set the attributes of the decline', () => {
      this.decline.setId(1)
        .setRfqId(3)
        .setMarketId(4)
        .setClientId(5)
        .setProviderId(6)
        .setReasons([{ message: 'should be <= 5000' }])
        .setCreatedOn('2018-04-06T13:02:01.857Z');
      this.decline.id.should.equal(1);
      this.decline.rfqId.should.equal(3);
      this.decline.marketId.should.equal(4);
      this.decline.clientId.should.equal(5);
      this.decline.providerId.should.equal(6);
      this.decline.reasons.should.eql([{ message: 'should be <= 5000' }]);
      this.decline.createdOn.should.eql(new Date('2018-04-06T13:02:01.857Z'));
    });

    it('should return the decline object', () => {
      this.decline.setId(1).should.equal(this.decline);
      this.decline.setRfqId(3).should.equal(this.decline);
      this.decline.setMarketId(4).should.equal(this.decline);
      this.decline.setClientId(5).should.equal(this.decline);
      this.decline.setProviderId(6).should.equal(this.decline);
      this.decline.setCreatedOn('2018-04-06T13:02:01.857Z').should.equal(this.decline);
      this.decline.setReasons([{}]).should.equal(this.decline);
    });
  });
});
