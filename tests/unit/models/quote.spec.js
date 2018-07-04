const chai = require('chai');
const { Quote } = require('../../../src/models/quote');

chai.should();

describe('Quote model', () => {
  beforeEach(() => {
    this.quote = new Quote();
  });

  describe('Build quote with all relevant attributes', () => {
    it('should set the attributes of the quote', () => {
      this.quote.setId(1)
        .setRevisionId(2)
        .setRfqId(3)
        .setMarketId(4)
        .setClientId(5)
        .setProviderId(6)
        .setPayload({})
        .setLifespan(3600000)
        .setStatus('active')
        .setAcceptance({})
        .setCompletion({})
        .setOnBehalfOf('me')
        .setCreatedOn('2018-04-06T13:02:01.857Z')
        .setUpdatedOn('2018-04-06T13:10:01.857Z');
      this.quote.id.should.equal(1);
      this.quote.revisionId.should.equal(2);
      this.quote.rfqId.should.equal(3);
      this.quote.marketId.should.equal(4);
      this.quote.clientId.should.equal(5);
      this.quote.providerId.should.equal(6);
      this.quote.payload.should.eql({});
      this.quote.lifespan.should.eql(3600000);
      this.quote.status.should.equal('active');
      this.quote.acceptance.should.eql({});
      this.quote.completion.should.eql({});
      this.quote.onBehalfOf.should.eql('me');
      this.quote.createdOn.should.eql(new Date('2018-04-06T13:02:01.857Z'));
      this.quote.updatedOn.should.eql(new Date('2018-04-06T13:10:01.857Z'));
    });

    it('should return the quote object', () => {
      this.quote.setId(1).should.equal(this.quote);
      this.quote.setRevisionId(2).should.equal(this.quote);
      this.quote.setRfqId(3).should.equal(this.quote);
      this.quote.setMarketId(4).should.equal(this.quote);
      this.quote.setClientId(5).should.equal(this.quote);
      this.quote.setProviderId(6).should.equal(this.quote);
      this.quote.setPayload({}).should.equal(this.quote);
      this.quote.setLifespan(3600000).should.equal(this.quote);
      this.quote.setStatus('active').should.equal(this.quote);
      this.quote.setAcceptance({}).should.equal(this.quote);
      this.quote.setCompletion({}).should.equal(this.quote);
      this.quote.setOnBehalfOf('me').should.equal(this.quote);
      this.quote.setCreatedOn('2018-04-06T13:02:01.857Z').should.equal(this.quote);
      this.quote.setUpdatedOn('2018-04-06T13:10:01.857Z').should.equal(this.quote);
    });
  });
});
