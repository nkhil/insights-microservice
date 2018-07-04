const chai = require('chai');
const { ProviderTransformer } = require('../../../src/databases/provider');
const { Provider } = require('../../../src/models');

chai.should();

describe('ProviderTransformer', () => {
  beforeEach(() => {
    this.provider = new Provider()
      .setId(1)
      .setRevisionId(2)
      .setName('name')
      .setDescription('description')
      .setMarketId(1)
      .setWebhookURL('http://google.com')
      .setWebhookHeaders({ Authorization: '1' })
      .setFilterSchema({ name: 'test' })
      .setImageUrl('http://imageurl.com')
      .setLocations([{ name: 'test location', lat: 50, long: 50 }])
      .setCreatedOn('2018-04-05T13:23:01.632Z')
      .setUpdatedOn('2018-04-05T13:23:01.760Z');
    this.dbObject = {
      id: 1,
      revision_id: 2,
      name: 'name',
      description: 'description',
      market_id: 1,
      webhook_url: 'http://google.com',
      webhook_headers: { Authorization: '1' },
      filter_schema: { name: 'test' },
      image_url: 'http://imageurl.com',
      locations: [{ name: 'test location', lat: 50, long: 50 }],
      created_on: '2018-04-05T13:23:01.632Z',
      updated_on: '2018-04-05T13:23:01.760Z'
    };
    this.revisionObject = {
      main: {
        id: 1,
        market_id: 1,
        name: 'name',
        revision_id: 2
      },
      revision: {
        provider_id: 1,
        description: 'description',
        id: 2,
        webhook_headers: JSON.stringify({ Authorization: '1' }),
        webhook_url: 'http://google.com',
        filter_schema: JSON.stringify({ name: 'test' }),
        image_url: 'http://imageurl.com',
        locations: JSON.stringify([{ name: 'test location', lat: 50, long: 50 }])
      }
    };
  });

  describe('#toDatabase', () => {
    it('should throw an error when passing a non-Provider instance as argument', () => {
      (() => ProviderTransformer.toDatabase('string')).should.throw();
    });

    it('should return an object with id and name', () => {
      ProviderTransformer.toDatabase(this.provider).should.eql(this.revisionObject);
    });
  });

  describe('#fromDatabase', () => {
    it('should return an instance of Provider with the correct properties', () => {
      const provider = ProviderTransformer.fromDatabase(this.dbObject);
      provider.should.be.eql(this.provider);
    });
  });
});

