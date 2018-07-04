const chai = require('chai');
const { Market } = require('../../../src/models/market');

chai.should();

describe('Market model', () => {
  beforeEach(() => {
    this.market = new Market();
  });

  describe('Build market with all relevant attributes', () => {
    it('should set the attributes of the market', () => {
      this.market
        .setId(1)
        .setRevisionId(2)
        .setName('name')
        .setDescription('desc')
        .setImageUrl('http://imageurl.com')
        .setIsActive(true)
        .setLit(false)
        .setRfqDefaultLifespan(86400000)
        .setRfqCloseOnAccept(false)
        .setRfqSchema({})
        .setQuoteSchema({})
        .setAcceptanceSchema({})
        .setCompletionSchema({})
        .setCreatedOn('2018-04-05T13:23:01.632Z')
        .setUpdatedOn('2018-04-05T13:23:01.760Z');
      this.market.id.should.equal(1);
      this.market.revisionId.should.equal(2);
      this.market.name.should.equal('name');
      this.market.description.should.equal('desc');
      this.market.imageUrl.should.equal('http://imageurl.com');
      this.market.isActive.should.equal(true);
      this.market.lit.should.equal(false);
      this.market.rfqDefaultLifespan.should.equal(86400000);
      this.market.rfqCloseOnAccept.should.equal(false);
      this.market.rfqSchema.should.eql({});
      this.market.quoteSchema.should.eql({});
      this.market.acceptanceSchema.should.eql({});
      this.market.completionSchema.should.eql({});
      this.market.createdOn.should.eql(new Date('2018-04-05T13:23:01.632Z'));
      this.market.updatedOn.should.eql(new Date('2018-04-05T13:23:01.760Z'));
    });


    it('should return the market object', () => {
      this.market.setId(1).should.equal(this.market);
      this.market.setRevisionId(2).should.equal(this.market);
      this.market.setName('name').should.equal(this.market);
      this.market.setDescription('desc').should.equal(this.market);
      this.market.setImageUrl('http://imageurl.com').should.equal(this.market);
      this.market.setIsActive(true).should.equal(this.market);
      this.market.setLit(false).should.equal(this.market);
      this.market.setRfqDefaultLifespan(86400000).should.equal(this.market);
      this.market.setRfqCloseOnAccept(false).should.equal(this.market);
      this.market.setRfqSchema({}).should.equal(this.market);
      this.market.setQuoteSchema({}).should.equal(this.market);
      this.market.setAcceptanceSchema({}).should.equal(this.market);
      this.market.setCompletionSchema({}).should.equal(this.market);
      this.market.setCreatedOn('2018-04-05T13:23:01.632Z').should.equal(this.market);
      this.market.setUpdatedOn('2018-04-05T13:23:01.760Z').should.equal(this.market);
    });
  });
});
