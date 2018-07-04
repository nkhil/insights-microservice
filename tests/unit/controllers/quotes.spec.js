const chai = require('chai');
const validator = require('validator');
const uuid = require('uuid/v4');
const { QuotesController } = require('../../../src/controllers/quotes');
const { InMemoryDB } = require('../../assets/inmemorydb');
const { InvalidParametersError, MissingParametersError, DatabaseError } = require('../../../src/errors');
const { Quote } = require('../../../src/models');

const should = chai.should();

describe('quote controller', () => {
  beforeEach(() => {
    this.databaseStub = new InMemoryDB();
    this.testController = new QuotesController(this.databaseStub);
  });

  describe('#create', () => {
    context('success', () => {
      it('should create a quote', async () => {
        const quotePayload = { rfqId: uuid(), payload: { test: 'test payload' }, lifespan: 8600000 };
        const { err, data } = await this.testController.create(quotePayload);
        should.not.exist(err);
        data.should.be.instanceOf(Quote);
        data.id.should.satisfy(id => validator.isUUID(id, 4));
        data.rfqId.should.satisfy(id => validator.isUUID(id, 4));
        data.payload.should.eql(quotePayload.payload);
        data.lifespan.should.eql(quotePayload.lifespan);
      });
    });
    context('errors', () => {
      beforeEach(() => this.databaseStub.toggleError());

      it('should return DatabaseError from db layer', async () => {
        const quotePayload = { rfqId: uuid(), payload: { test: 'test payload' }, lifespan: 8600000 };
        const { err, data } = await this.testController.create(quotePayload);
        should.not.exist(data);
        err.should.be.instanceof(DatabaseError);
      });
    });
  });

  describe('#get', () => {
    beforeEach(async () => {
      const { data } = await this.testController.create({ rfqId: uuid(), payload: { test: 'test payload' }, lifespan: 8600000 });
      this.quote = data;
    });
    context('success', () => {
      it('should get the correct rfq', async () => {
        const { err, data } = await this.testController.get({ id: this.quote.id });
        should.not.exist(err);
        data.should.be.instanceof(Quote);
        data.id.should.equal(this.quote.id);
        data.rfqId.should.equal(this.quote.rfqId);
        data.payload.should.eql(this.quote.payload);
        data.lifespan.should.eql(this.quote.lifespan);
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
        const { err, data } = await this.testController.get({ id: this.quote.id });
        should.not.exist(data);
        err.should.be.instanceof(DatabaseError);
      });
    });
  });
});
