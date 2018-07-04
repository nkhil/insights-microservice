const chai = require('chai');
const { MarketTransformer } = require('../../../src/databases/market');
const { Market } = require('../../../src/models/market');

chai.should();
describe('MarketTransformer', () => {
  beforeEach(() => {
    this.market = new Market()
      .setId('id')
      .setRevisionId('revisionId')
      .setName('marketName')
      .setDescription('marketDesc')
      .setImageUrl('http://imageurl.com')
      .setIsActive(true)
      .setLit(true)
      .setRfqDefaultLifespan(1000)
      .setRfqCloseOnAccept(false)
      .setRfqSchema({})
      .setQuoteSchema({})
      .setAcceptanceSchema({})
      .setCompletionSchema({})
      .setCreatedOn('2018-04-05T13:23:01.632Z')
      .setUpdatedOn('2018-04-05T13:23:01.760Z');
    this.dbObject = {
      market_id: 'id',
      revision_id: 'revisionId',
      name: 'marketName',
      description: 'marketDesc',
      image_url: 'http://imageurl.com',
      active: true,
      is_lit: true,
      rfq_default_lifespan: 1000,
      rfq_close_on_accept: false,
      rfq_schema: {},
      quote_schema: {},
      acceptance_schema: {},
      completion_schema: {},
      created_on: '2018-04-05T13:23:01.632Z',
      updated_on: '2018-04-05T13:23:01.760Z'
    };
    this.revisionObject = {
      main: {
        id: 'id',
        revision_id: 'revisionId',
        name: 'marketName'
      },
      revision: {
        active: true,
        description: 'marketDesc',
        image_url: 'http://imageurl.com',
        id: 'revisionId',
        is_lit: true,
        market_id: 'id',
        quote_schema: '{}',
        rfq_close_on_accept: false,
        rfq_default_lifespan: 1000,
        rfq_schema: '{}',
        acceptance_schema: '{}',
        completion_schema: '{}'
      }
    };
  });

  describe('#toDatabase', () => {
    it('should throw an error when passing a non-Market instance as argument', () => {
      (() => MarketTransformer.toDatabase('string')).should.throw();
    });

    it('should return an object with market_id and market_name', () => {
      MarketTransformer.toDatabase(this.market).should.eql(this.revisionObject);
    });
  });

  describe('#fromDatabase', () => {
    it('should return an instance of Market with the correct properties', () => {
      const market = MarketTransformer.fromDatabase(this.dbObject);
      market.should.be.eql(this.market);
    });
  });
});
