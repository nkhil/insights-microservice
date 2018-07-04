const chai = require('chai');
const { ClientTransformer } = require('../../../src/databases/client');
const { Client } = require('../../../src/models');

chai.should();

describe('ClientTransformer', () => {
  beforeEach(() => {
    this.client = new Client()
      .setId(1)
      .setRevisionId(2)
      .setName('name')
      .setMarketId(1)
      .setDescription('desc')
      .setWebhookUrl('http://google.com')
      .setWebhookHeaders({ Authorization: '1' })
      .setCreatedOn('2018-04-05T13:23:01.632Z')
      .setUpdatedOn('2018-04-05T13:23:01.760Z');
    this.dbObject = { id: 1, revision_id: 2, name: 'name', description: 'desc', market_id: 1, webhook_url: 'http://google.com', webhook_headers: { Authorization: '1' }, created_on: '2018-04-05T13:23:01.632Z', updated_on: '2018-04-05T13:23:01.760Z' };
    this.revisionObject = {
      main: {
        id: 1,
        market_id: 1,
        name: 'name',
        revision_id: 2
      },
      revision: {
        client_id: 1,
        description: 'desc',
        id: 2,
        webhook_headers: JSON.stringify({ Authorization: '1' }),
        webhook_url: 'http://google.com'
      }
    };
  });

  describe('#toDatabase', () => {
    it('should throw an error when passing a non-Client instance as argument', () => {
      (() => ClientTransformer.toDatabase('string')).should.throw();
    });

    it('should return an object with client_id and client_name', () => {
      ClientTransformer.toDatabase(this.client).should.eql(this.revisionObject);
    });
  });

  describe('#fromDatabase', () => {
    it('should return an instance of Client with the correct properties', () => {
      const client = ClientTransformer.fromDatabase(this.dbObject);
      client.should.be.eql(this.client);
    });
  });
});

