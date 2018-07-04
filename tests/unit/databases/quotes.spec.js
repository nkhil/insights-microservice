const chai = require('chai');
const { QuoteTransformer } = require('../../../src/databases/quote');
const { Quote } = require('../../../src/models');

chai.should();

describe('QuoteTransformer', () => {
  beforeEach(() => {
    this.quote = new Quote()
      .setId(1)
      .setRevisionId(2)
      .setRfqId(3)
      .setMarketId(4)
      .setClientId(5)
      .setProviderId(6)
      .setPayload({})
      .setLifespan(8600000)
      .setStatus('active')
      .setAcceptance({})
      .setCompletion({})
      .setOnBehalfOf('me')
      .setCreatedOn('2018-04-06T13:02:01.857Z')
      .setUpdatedOn('2018-04-06T13:10:01.857Z');
    this.dbObject = {
      quote_id: 1,
      revision_id: 2,
      rfq_id: 3,
      market_id: 4,
      client_id: 5,
      provider_id: 6,
      payload: {},
      lifespan: 8600000,
      status: 'active',
      acceptance: {},
      completion: {},
      on_behalf_of: 'me',
      created_on: '2018-04-06T13:02:01.857Z',
      updated_on: '2018-04-06T13:10:01.857Z'
    };
    this.revisionObject = {
      main: {
        id: 1,
        revision_id: 2,
        rfq_id: 3,
        market_id: 4,
        client_id: 5,
        provider_id: 6,
        lifespan: 8600000,
        payload: '{}',
        on_behalf_of: 'me'
      },
      revision: {
        id: 2,
        quote_id: 1,
        acceptance: '{}',
        completion: '{}',
        status: 'active'
      }
    };
  });

  describe('#toDatabase', () => {
    it('should throw an error when passing a non-Quote instance as argument', () => {
      (() => QuoteTransformer.toDatabase('string')).should.throw();
    });

    it('should return an object with all relevant properties', () => {
      QuoteTransformer.toDatabase(this.quote).should.eql(this.revisionObject);
    });
  });

  describe('#fromDatabase', () => {
    it('should return an instance of Quote with the correct properties', () => {
      const quote = QuoteTransformer.fromDatabase(this.dbObject);
      delete this.quote.onBehalfOf;
      quote.should.be.eql(this.quote);
    });
  });
});
