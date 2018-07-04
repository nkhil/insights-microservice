const chai = require('chai');


const { DispatchRequest } = require('../../../src/models/dispatch');
const { DispatchTransformer } = require('../../../src/databases/dispatch');

chai.should();

describe('Dispatch Databases', () => {
  describe('DispatchTransformer', () => {
    describe('#toDatabase', () => {
      context('success', () => {
        const properties = {
          id: 1,
          batchId: 2,
          targetId: 3,
          request: { method: 'POST', uri: 'http://localhost:3000', timeout: 5000 },
          isDead: true,
          isDelivered: false,
          error: { 1: { code: 400 } },
          deliveredAt: new Date(),
          killedAt: new Date()
        };
        it('returns an object with the values from the DispatchRequest', () => {
          const dispatchRequest = new DispatchRequest({})
            .setId(properties.id)
            .setBatchId(properties.batchId)
            .setTargetId(properties.targetId)
            .setRequest(properties.request)
            .setIsDead(properties.isDead)
            .setIsDelivered(properties.isDelivered)
            .setError(properties.error)
            .setDeliveredAt(properties.deliveredAt)
            .setKilledAt(properties.killedAt);
          const transformedDispatch = DispatchTransformer.toDatabase(dispatchRequest);
          transformedDispatch.should.be.instanceof(Object);
          transformedDispatch.id.should.equal(properties.id);
          transformedDispatch.batch_id.should.equal(properties.batchId);
          transformedDispatch.target_id.should.equal(properties.targetId);
          transformedDispatch.request.should.eql(JSON.stringify(properties.request));
          transformedDispatch.is_dead.should.equal(properties.isDead);
          transformedDispatch.is_delivered.should.equal(properties.isDelivered);
          transformedDispatch.error.should.eql(JSON.stringify(properties.error));
          transformedDispatch.delivered_at.should.equal(properties.deliveredAt.toISOString());
          transformedDispatch.killed_at.should.equal(properties.killedAt.toISOString());
        });
      });

      context('error', () => {
        it('throws a type error', () => {
          (() => DispatchRequest.toDatabase('Not a Market Model')).should.throw();
        });
      });
    });
    describe('#fromDatabase', () => {
      beforeEach(() => {
        this.model = {
          id: 1,
          batch_id: 2,
          target_id: 3,
          request: { method: 'POST', uri: 'http://localhost:3000', timeout: 5000 },
          is_dead: true,
          is_delivered: false,
          error: { 1: { code: 400 } },
          delivered_at: new Date(),
          killed_at: new Date()
        };
      });
      it('should return an instance of dispatch request', async () => {
        const dispatchRequest = DispatchTransformer.fromDatabase(this.model);
        dispatchRequest.should.be.instanceof(DispatchRequest);
      });
      it('should set correct fields', async () => {
        const dispatchRequest = DispatchTransformer.fromDatabase(this.model);
        dispatchRequest.should.be.instanceof(Object);
        dispatchRequest.id.should.equal(this.model.id);
        dispatchRequest.batchId.should.equal(this.model.batch_id);
        dispatchRequest.targetId.should.equal(this.model.target_id);
        dispatchRequest.request.should.eql(this.model.request);
        dispatchRequest.isDead.should.equal(this.model.is_dead);
        dispatchRequest.isDelivered.should.equal(this.model.is_delivered);
        dispatchRequest.error.should.eql(this.model.error);
        dispatchRequest.deliveredAt.should.eql(this.model.delivered_at);
        dispatchRequest.killedAt.should.eql(this.model.killed_at);
      });
    });
  });
});
