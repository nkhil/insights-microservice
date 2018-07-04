const chai = require('chai');
const validator = require('validator');
const uuid = require('uuid/v4');
const { RfqsController } = require('../../../src/controllers/rfqs');
const { InMemoryDB } = require('../../assets/inmemorydb');
const { InvalidParametersError, MissingParametersError, DatabaseError } = require('../../../src/errors');
const { Rfq } = require('../../../src/models');

const should = chai.should();

describe('rfq controller', () => {
  beforeEach(() => {
    this.databaseStub = new InMemoryDB();
    this.testController = new RfqsController(this.databaseStub);
  });

  describe('#create', () => {
    context('success', () => {
      it('should create a rfq', async () => {
        const rfqPayload = { payload: { test: 'test payload' }, requestGroup: [1, 2, 3], clientId: uuid(), marketId: uuid(), lifespan: 1 };
        const { err, data } = await this.testController.create(rfqPayload);
        should.not.exist(err);
        data.should.be.instanceOf(Rfq);
        data.id.should.satisfy(id => validator.isUUID(id, 4));
        data.payload.should.eql(rfqPayload.payload);
        data.requestGroup.should.eql(rfqPayload.requestGroup);
        data.clientId.should.equal(rfqPayload.clientId);
        data.marketId.should.equal(rfqPayload.marketId);
        data.lifespan.should.equal(rfqPayload.lifespan);
      });
    });
    context('errors', () => {
      beforeEach(() => this.databaseStub.toggleError());

      it('should return DatabaseError from db layer', async () => {
        const rfqPayload = { payload: { test: 'test payload' }, requestGroup: [1, 2, 3], clientId: uuid(), marketId: uuid(), lifespan: 1 };
        const { err, data } = await this.testController.create(rfqPayload);
        should.not.exist(data);
        err.should.be.instanceof(DatabaseError);
      });
    });
  });

  describe('#get', () => {
    beforeEach(async () => {
      const { data } = await this.testController.create({ payload: { test: 'test' }, requestGroup: ['1', '2', '3'] });
      this.id = data.id;
      this.payload = data.payload;
      this.requestGroup = data.requestGroup;
    });
    context('success', () => {
      it('should get the correct rfq', async () => {
        const { err, data } = await this.testController.get({ id: this.id });
        should.not.exist(err);
        data.should.be.instanceof(Rfq);
        data.id.should.equal(this.id);
        data.payload.should.eql(this.payload);
        data.requestGroup.should.equal(this.requestGroup);
      });
    });
    context('error', () => {
      beforeEach(() => this.databaseStub.toggleError());
      it('should return MissingParameters error when ID is not given', async () => {
        const { err, data } = await this.testController.get({ });
        should.not.exist(data);
        err.should.be.instanceOf(MissingParametersError);
      });
      it('should return InvalidParameters error when ID is not a string', async () => {
        const { err, data } = await this.testController.get({ id: 1 });
        should.not.exist(data);
        err.should.be.instanceOf(InvalidParametersError);
      });
      it('should return InvalidParameters error when ID is not uuid', async () => {
        const { err, data } = await this.testController.get({ id: 'test' });
        should.not.exist(data);
        err.should.be.instanceOf(InvalidParametersError);
      });
      it('should return DatabaseError from db layer when db returns an error', async () => {
        const { err, data } = await this.testController.get({ id: this.id });
        should.not.exist(data);
        err.should.be.instanceof(DatabaseError);
      });
    });
  });
});
