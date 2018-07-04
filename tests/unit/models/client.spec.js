const chai = require('chai');
const { Client } = require('../../../src/models/client');

chai.should();

describe('Client model', () => {
  beforeEach(() => {
    this.client = new Client();
  });

  describe('Build client with all relevant attributes', () => {
    it('should set the attributes of the client', () => {
      this.client
        .setId(1)
        .setRevisionId(2)
        .setName('name')
        .setDescription('desc')
        .setMarketId(3)
        .setWebhookUrl('http://google.com')
        .setWebhookHeaders({ Authorization: '1' })
        .setCreatedOn('2018-04-05T13:23:01.632Z')
        .setUpdatedOn('2018-04-05T13:23:01.760Z');
      this.client.id.should.equal(1);
      this.client.revisionId.should.equal(2);
      this.client.name.should.equal('name');
      this.client.description.should.equal('desc');
      this.client.marketId.should.equal(3);
      this.client.webhookUrl.should.equal('http://google.com');
      this.client.webhookHeaders.should.eql({ Authorization: '1' });
      this.client.createdOn.should.eql(new Date('2018-04-05T13:23:01.632Z'));
      this.client.updatedOn.should.eql(new Date('2018-04-05T13:23:01.760Z'));
    });


    it('should return the client object', () => {
      this.client.setId(1).should.equal(this.client);
      this.client.setRevisionId(2).should.equal(this.client);
      this.client.setName('name').should.equal(this.client);
      this.client.setDescription('name').should.equal(this.client);
      this.client.setMarketId(3).should.equal(this.client);
      this.client.setWebhookUrl('http://google.com').should.equal(this.client);
      this.client.setWebhookHeaders({ Authorization: '1' }).should.equal(this.client);
      this.client.setCreatedOn('2018-04-05T13:23:01.632Z').should.equal(this.client);
      this.client.setUpdatedOn('2018-04-05T13:23:01.760Z').should.equal(this.client);
    });
  });
});
