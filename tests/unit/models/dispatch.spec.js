const chai = require('chai');
const { DispatchRequest } = require('../../../src/models/dispatch');

chai.should();


describe('DispatchRequest', () => {
  const request = { method: 'GET', uri: 'http://localhost:3000', timeout: 500 };

  describe('builder methods', () => {
    beforeEach(() => {
      this.dispatch = new DispatchRequest({ request });
    });
    it('should set the right properties', () => {
      const properties = {
        id: 1,
        batchId: 2,
        targetId: 3,
        request: { method: 'POST', uri: 'http://localhost:3000', timeout: 5000 },
        isDead: true,
        isDelivered: false,
        isSaved: true,
        error: { 1: { code: 400 } },
        deliveredAt: new Date(),
        killedAt: new Date()
      };
      this.dispatch
        .setId(properties.id)
        .setBatchId(properties.batchId)
        .setTargetId(properties.targetId)
        .setRequest(properties.request)
        .setIsDead(properties.isDead)
        .setIsDelivered(properties.isDelivered)
        .setError(properties.error)
        .setDeliveredAt(properties.deliveredAt)
        .setKilledAt(properties.killedAt);

      this.dispatch.id.should.equal(properties.id);
      this.dispatch.batchId.should.eql(properties.batchId);
      this.dispatch.targetId.should.eql(properties.targetId);
      this.dispatch.request.should.eql(properties.request);
      this.dispatch.isDead.should.equal(properties.isDead);
      this.dispatch.isDelivered.should.equal(properties.isDelivered);
      this.dispatch.error.should.equal(properties.error);
      this.dispatch.deliveredAt.should.equal(properties.deliveredAt);
      this.dispatch.killedAt.should.equal(properties.killedAt);
    });
  });
});
