const chai = require('chai');
const { Provider } = require('../../../src/models/provider');

chai.should();

describe('Provider model', () => {
  beforeEach(() => {
    this.provider = new Provider();
  });

  describe('Build provider with all relevant attributes', () => {
    it('should set the attributes of the provider', () => {
      const headers = { type: 'JSON' };
      const locations = { name: 'test location', lat: 50, long: 50 };
      this.provider
        .setId(1)
        .setRevisionId(2)
        .setName('name')
        .setDescription('desc')
        .setMarketId(3)
        .setWebhookURL('www.test.com')
        .setWebhookHeaders(headers)
        .setFilterSchema({ field: true })
        .setImageUrl('http://imageurl.com')
        .setLocations([locations])
        .setCreatedOn('2018-04-05T13:23:01.632Z')
        .setUpdatedOn('2018-04-05T13:23:01.760Z');
      this.provider.id.should.equal(1);
      this.provider.revisionId.should.equal(2);
      this.provider.name.should.equal('name');
      this.provider.description.should.equal('desc');
      this.provider.marketId.should.equal(3);
      this.provider.webhookUrl.should.equal('www.test.com');
      this.provider.webhookHeaders.should.eql(headers);
      this.provider.filterSchema.should.eql({ field: true });
      this.provider.imageUrl.should.equal('http://imageurl.com');
      this.provider.locations.should.eql([locations]);
      this.provider.createdOn.should.eql(new Date('2018-04-05T13:23:01.632Z'));
      this.provider.updatedOn.should.eql(new Date('2018-04-05T13:23:01.760Z'));
    });


    it('should return the provider object', () => {
      this.provider.setId(1).should.equal(this.provider);
      this.provider.setRevisionId(2).should.equal(this.provider);
      this.provider.setName('name').should.equal(this.provider);
      this.provider.setDescription('desc').should.equal(this.provider);
      this.provider.setMarketId(3).should.equal(this.provider);
      this.provider.setWebhookURL('www.test.com').should.equal(this.provider);
      this.provider.setWebhookHeaders({}).should.equal(this.provider);
      this.provider.setFilterSchema({}).should.equal(this.provider);
      this.provider.setImageUrl('http://imageurl.com').should.equal(this.provider);
      this.provider.setLocations([]).should.equal(this.provider);
      this.provider.setCreatedOn('2018-04-05T13:23:01.632Z').should.equal(this.provider);
      this.provider.setUpdatedOn('2018-04-05T13:23:01.760Z').should.equal(this.provider);
    });
  });
});
