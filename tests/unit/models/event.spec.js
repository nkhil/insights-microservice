const chai = require('chai');
const { Event } = require('../../../src/models/event');

chai.should();

describe('Event model', () => {
  beforeEach(() => {
    this.event = new Event();
  });

  describe('Build event with all relevant attributes', () => {
    it('should set the attributes of the event', () => {
      this.event
        .setType('RFQ')
        .setEvent('CREATE')
        .setData({ a: 1 })
        .setMarketId(1);
      this.event.type.should.equal('RFQ');
      this.event.event.should.equal('CREATE');
      this.event.data.should.eql({ a: 1 });
      this.event.marketId.should.equal(1);
      this.event.environment.should.equal('local');
    });
    it('should return the event object', () => {
      this.event.setType('RFQ').should.equal(this.event);
      this.event.setEvent('CREATE').should.equal(this.event);
      this.event.setData({ a: 1 }).should.equal(this.event);
      this.event.setMarketId(1).should.equal(this.event);
      this.event.environment.should.equal('local');
    });
  });
});
