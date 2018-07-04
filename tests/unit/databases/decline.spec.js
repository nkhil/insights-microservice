const chai = require('chai');
const { DeclineTransformer } = require('../../../src/databases/decline');
const { Decline } = require('../../../src/models');

chai.should();

describe('DeclineTransformer', () => {
  beforeEach(() => {
    this.decline = new Decline()
      .setId(1)
      .setRfqId(3)
      .setMarketId(4)
      .setClientId(5)
      .setProviderId(6)
      .setReasons([{ schemaPath: '/value/maximum', message: 'should be <= 5000' }])
      .setCreatedOn('2018-04-06T13:02:01.857Z');
    this.dbObject = {
      id: 1,
      rfq_id: 3,
      market_id: 4,
      client_id: 5,
      provider_id: 6,
      reasons: [{ schemaPath: '/value/maximum', message: 'should be <= 5000' }],
      created_on: '2018-04-06T13:02:01.857Z'
    };
    this.transformed = {
      id: 1,
      rfq_id: 3,
      market_id: 4,
      client_id: 5,
      provider_id: 6,
      reasons: JSON.stringify([{ schemaPath: '/value/maximum', message: 'should be <= 5000' }])
    };
  });

  describe('#toDatabase', () => {
    it('should throw an error when passing a non-Decline instance as argument', () => {
      (() => DeclineTransformer.toDatabase('string')).should.throw();
    });

    it('should return an object with all relevant properties', () => {
      DeclineTransformer.toDatabase(this.decline).should.eql(this.transformed);
    });
  });

  describe('#fromDatabase', () => {
    it('should return an instance of Decline with the correct properties', () => {
      const decline = DeclineTransformer.fromDatabase(this.dbObject);
      decline.should.be.eql(this.decline);
    });
  });
});
