const chai = require('chai');
const { RfqTransformer } = require('../../../src/databases/rfq');
const { Rfq } = require('../../../src/models');

chai.should();

describe('RfqTransformer', () => {
  beforeEach(() => {
    this.rfq = new Rfq()
      .setId(1)
      .setPayload({ Test: 'test' })
      .setRequestGroup(['test'])
      .setClientId(2)
      .setMarketId(3)
      .setLifespan(4)
      .setOnBehalfOf(5)
      .setCreatedOn('2018-03-28');
    this.dbObject = {
      id: 1,
      payload: { Test: 'test' },
      request_group: ['test'],
      client_id: 2,
      market_id: 3,
      lifespan: 4,
      on_behalf_of: 5,
      created_on: '2018-03-28'
    };
  });

  describe('#toDatabase', () => {
    it('should throw an error when passing a non-Rfq instance as argument', () => {
      (() => RfqTransformer.toDatabase('string')).should.throw();
    });

    it('should return an object with all relevant properties', () => {
      RfqTransformer.toDatabase(this.rfq).should.eql({
        id: 1,
        payload: JSON.stringify({ Test: 'test' }),
        request_group: JSON.stringify(['test']),
        client_id: 2,
        market_id: 3,
        lifespan: 4,
        on_behalf_of: 5
      });
    });
  });

  describe('#fromDatabase', () => {
    it('should return an instance of Rfq with the correct properties', () => {
      RfqTransformer.fromDatabase(this.dbObject).should.eql(this.rfq);
    });
  });
});
