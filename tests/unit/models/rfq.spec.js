const chai = require('chai');
const { Rfq } = require('../../../src/models/rfq');

chai.should();

describe('Rfq model', () => {
  beforeEach(() => {
    this.rfq = new Rfq();
  });

  describe('Build rfq with all relevant attributes', () => {
    it('should set the attributes of the rfq', () => {
      this.rfq.setId(1)
        .setPayload({})
        .setRequestGroup([])
        .setClientId(2)
        .setMarketId(3)
        .setLifespan(4)
        .setOnBehalfOf(5)
        .setCreatedOn('2018-04-05T13:23:01.632Z');
      this.rfq.id.should.equal(1);
      this.rfq.payload.should.eql({});
      this.rfq.requestGroup.should.eql([]);
      this.rfq.clientId.should.equal(2);
      this.rfq.marketId.should.equal(3);
      this.rfq.lifespan.should.equal(4);
      this.rfq.onBehalfOf.should.equal(5);
      this.rfq.createdOn.should.eql(new Date('2018-04-05T13:23:01.632Z'));
    });

    it('should return the rfq object', () => {
      this.rfq.setId(1).should.equal(this.rfq);
      this.rfq.setPayload({}).should.equal(this.rfq);
      this.rfq.setRequestGroup([]).should.equal(this.rfq);
      this.rfq.setClientId(2).should.equal(this.rfq);
      this.rfq.setMarketId(3).should.equal(this.rfq);
      this.rfq.setLifespan(4).should.equal(this.rfq);
      this.rfq.setOnBehalfOf(5).should.equal(this.rfq);
      this.rfq.setCreatedOn('2018-04-05T13:23:01.632Z');
    });
  });
});
