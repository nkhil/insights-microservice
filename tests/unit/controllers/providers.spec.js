const chai = require('chai');
const validator = require('validator');
const { ProvidersController } = require('../../../src/controllers/providers');
const { InMemoryDB } = require('../../assets/inmemorydb');
const { InvalidParametersError, MissingParametersError, DatabaseError } = require('../../../src/errors');
const { Provider } = require('../../../src/models');

const should = chai.should();

describe('provider controller', () => {
  beforeEach(() => {
    this.databaseStub = new InMemoryDB();
    this.testController = new ProvidersController(this.databaseStub);
  });

  describe('#create', () => {
    context('success', () => {
      it('should create a provider', async () => {
        const { err, data } = await this.testController.create({ name: 'testProvider', marketId: 'marketId' });
        should.not.exist(err);
        data.should.be.instanceOf(Provider);
        data.id.should.satisfy(id => validator.isUUID(id, 4));
        data.name.should.equal('testProvider');
        data.marketId.should.equal('marketId');
      });
    });
    context('errors', () => {
      beforeEach(() => this.databaseStub.toggleError());

      it('should return DatabaseError from db layer', async () => {
        const { err, data } = await this.testController.create({ name: 'testProvider' });
        should.not.exist(data);
        err.should.be.instanceof(DatabaseError);
      });
    });
  });

  describe('#get', () => {
    context('success', () => {
      beforeEach(async () => {
        const { data } = await this.testController.create({ name: 'testProvider' });
        this.id = data.id;
      });

      it('should get the correct provider', async () => {
        const { err, data } = await this.testController.get({ id: this.id });
        should.not.exist(err);
        data.should.be.instanceof(Provider);
        data.name.should.equal(data.name);
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

  describe('#list', () => {
    context('success', () => {
      beforeEach(async () => {
        this.testProvider1 = await this.testController.create({ name: 'testProvider1' });
        this.testProvider2 = await this.testController.create({ name: 'testProvider2' });
        await Promise.all([this.testController.create({ name: 'testProvider3' }),
          this.testController.create({ name: 'testProvider4' }),
          this.testController.create({ name: 'testProvider5' }),
          this.testController.create({ name: 'testProvider6' }),
          this.testController.create({ name: 'testProvider7' }),
          this.testController.create({ name: 'testProvider8' }),
          this.testController.create({ name: 'testProvider9' }),
          this.testController.create({ name: 'testProvider10' })
        ]);
      });

      it('should return an array as data containing the requested provider with offset 0, limit 1', async () => {
        const { err, data } = await this.testController.list({
          location: { lat: undefined }, offset: 0, limit: 1 });
        should.not.exist(err);
        data.should.include(data[0]);
        data[0].should.be.instanceOf(Provider);
        data[0].name.should.equal(this.testProvider1.data.name);
        data.length.should.equal(1);
      });
      it('should return an array as data containing the requested provider with offset 1, limit 1', async () => {
        const { err, data } = await this.testController.list({
          location: { lat: undefined }, offset: 1, limit: 1 });
        should.not.exist(err);
        data.should.include(data[0]);
        data[0].name.should.equal(this.testProvider2.data.name);
        data.length.should.equal(1);
      });
      it('should return an array as data containing all requested providers', async () => {
        const { err, data } = await this.testController.list({
          location: { lat: undefined }, offset: 0, limit: 2 });
        should.not.exist(err);
        data.should.include(data[0]);
        data.should.include(data[1]);
        data[0].name.should.equal(this.testProvider1.data.name);
        data[1].name.should.equal(this.testProvider2.data.name);
        data.length.should.equal(2);
      });
      it('should return an array with the 10 first entries when no arguments passed', async () => {
        const { err, data } = await this.testController.list({ location: { lat: undefined } });
        should.not.exist(err);
        data.length.should.equal(10);
      });
    });
    context('error', () => {
      beforeEach(() => this.databaseStub.toggleError());
      it('should return DatabaseError from db layer when error occurs', async () => {
        const { err, data } = await this.testController.list({ offset: 0, limit: 1 });
        should.not.exist(data);
        err.should.be.instanceof(DatabaseError);
      });
    });
  });

  describe('#update', () => {
    context('success', () => {
      beforeEach(async () => {
        const { data } = await this.testController.create({ name: 'testProvider' });
        this.id = data.id;
      });

      it('should update the requested property', async () => {
        const { err, data } = await this.testController.update({ id: this.id, webhookUrl: 'http://localhost:3000' });
        should.not.exist(err);
        data.webhookUrl.should.equal('http://localhost:3000');
      });

      context('error', () => {
        beforeEach(() => this.databaseStub.toggleError());

        it('should return MissingParameters error no ID is given', async () => {
          const { err, data } = await this.testController.update({ updates: { name: 'testProvider2' } });
          should.not.exist(data);
          err.should.be.instanceof(MissingParametersError);
        });
        it('should return InvalidParameters error when ID is not a string', async () => {
          const { err, data } = await this.testController.update({ id: 1, updates: { name: 'testProvider2' } });
          should.not.exist(data);
          err.should.be.instanceOf(InvalidParametersError);
        });
        it('should return InvalidParameters error when ID is not uuid', async () => {
          const { err, data } = await this.testController.update({ id: '1', updates: { name: 'testProvider2' } });
          should.not.exist(data);
          err.should.be.instanceof(InvalidParametersError);
        });
        it('should return DatabaseError from db layer when error occurs', async () => {
          const { err, data } = await this.testController.update({ id: this.id, updates: { name: 'testProvider2' } });
          should.not.exist(data);
          err.should.be.instanceof(DatabaseError);
        });
      });
    });
  });
  describe('#delete', () => {
    context('success', () => {
      beforeEach(async () => {
        const { data } = await this.testController.create({ name: 'testProvider' });
        this.id = data.id;
      });

      it('should return neither errors nor data if successful', async () => {
        const { err, data } = await this.testController.delete({ id: this.id });
        should.not.exist(err);
        should.not.exist(data);
      });
      it('should successfully delete the record', async () => {
        await this.testController.delete({ id: this.id });
        const { err, data } = await this.testController.get({ id: this.id });
        should.not.exist(data);
        err.should.be.instanceof(DatabaseError);
      });
      context('error', () => {
        beforeEach(() => this.databaseStub.toggleError());

        it('should return MissingParameters error no ID is given', async () => {
          const { err, data } = await this.testController.delete({ });
          should.not.exist(data);
          err.should.be.instanceof(MissingParametersError);
        });
        it('should return InvalidParameters error when ID is not a string', async () => {
          const { err, data } = await this.testController.delete({ id: 1 });
          should.not.exist(data);
          err.should.be.instanceOf(InvalidParametersError);
        });
        it('should return InvalidParameters error when ID is not uuid', async () => {
          const { err, data } = await this.testController.delete({ id: '1' });
          should.not.exist(data);
          err.should.be.instanceof(InvalidParametersError);
        });
        it('should return DatabaseError from db layer when error occurs', async () => {
          const { err, data } = await this.testController.delete({ id: this.id });
          should.not.exist(data);
          err.should.be.instanceof(DatabaseError);
        });
      });
    });
  });
});
