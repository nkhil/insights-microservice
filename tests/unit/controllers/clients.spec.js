const chai = require('chai');
const validator = require('validator');
const { ClientsController } = require('../../../src/controllers/clients');
const { InMemoryDB } = require('../../assets/inmemorydb');
const { InvalidParametersError, MissingParametersError, DatabaseError } = require('../../../src/errors');
const { Client } = require('../../../src/models');

const should = chai.should();

describe('client controller', () => {
  beforeEach(() => {
    this.databaseStub = new InMemoryDB();
    this.testController = new ClientsController(this.databaseStub);
  });

  describe('#create', () => {
    context('success', () => {
      it('should create a client', async () => {
        const { err, data } = await this.testController.create({ name: 'testClient' });
        should.not.exist(err);
        data.should.be.instanceOf(Client);
        data.id.should.satisfy(id => validator.isUUID(id, 4));
        data.name.should.equal('testClient');
      });
    });
    context('errors', () => {
      beforeEach(() => this.databaseStub.toggleError());

      it('should return DatabaseError from db layer', async () => {
        const { err, data } = await this.testController.create({ name: 'testClient' });
        should.not.exist(data);
        err.should.be.instanceof(DatabaseError);
      });
    });
  });

  describe('#get', () => {
    context('success', () => {
      beforeEach(async () => {
        const { data } = await this.testController.create({ name: 'testClient' });
        this.id = data.id;
      });

      it('should get the correct client', async () => {
        const { err, data } = await this.testController.get({ id: this.id });
        should.not.exist(err);
        data.should.be.instanceof(Client);
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
      it('should return DatabaseError from db layer when passing ID that does not exist', async () => {
        const { err, data } = await this.testController.get({ id: this.id });
        should.not.exist(data);
        err.should.be.instanceof(DatabaseError);
      });
    });
  });

  describe('#list', () => {
    context('success', () => {
      beforeEach(async () => {
        this.testClient1 = await this.testController.create({ name: 'testClient1' });
        this.testClient2 = await this.testController.create({ name: 'testClient2' });
        await Promise.all([this.testController.create({ name: 'testClient3' }),
          this.testController.create({ name: 'testClient4' }),
          this.testController.create({ name: 'testClient5' }),
          this.testController.create({ name: 'testClient6' }),
          this.testController.create({ name: 'testClient7' }),
          this.testController.create({ name: 'testClient8' }),
          this.testController.create({ name: 'testClient9' }),
          this.testController.create({ name: 'testClient10' })
        ]);
      });

      it('should return an array as data containing the requested client with offset 0, limit 1', async () => {
        const { err, data } = await this.testController.list({ offset: 0, limit: 1 });
        should.not.exist(err);
        data.length.should.equal(1);
        data[0].should.be.instanceOf(Client);
        data[0].name.should.equal(this.testClient1.data.name);
      });
      it('should return an array as data containing the requested client with offset 1, limit 1', async () => {
        const { err, data } = await this.testController.list({ offset: 1, limit: 1 });
        should.not.exist(err);
        data.should.include(data[0]);
        data[0].name.should.equal(this.testClient2.data.name);
        data.length.should.equal(1);
      });
      it('should return an array as data containing all requested clients', async () => {
        const { err, data } = await this.testController.list({ offset: 0, limit: 2 });
        should.not.exist(err);
        data.should.include(data[0]);
        data.should.include(data[1]);
        data[0].name.should.equal(this.testClient1.data.name);
        data[1].name.should.equal(this.testClient2.data.name);
        data.length.should.equal(2);
      });
      it('should return an array with the 10 first entries when no arguments passed', async () => {
        const { err, data } = await this.testController.list({});
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
        const { data } = await this.testController.create({ name: 'testClient' });
        this.id = data.id;
      });

      it('should update the requested property', async () => {
        const { err, data } = await this.testController.update({ id: this.id, description: 'testClient2' });
        should.not.exist(err);
        data.description.should.equal('testClient2');
      });

      context('error', () => {
        beforeEach(() => this.databaseStub.toggleError());

        it('should return MissingParameters error no ID is given', async () => {
          const { err, data } = await this.testController.update({ name: 'testClient2' });
          should.not.exist(data);
          err.should.be.instanceof(MissingParametersError);
        });
        it('should return InvalidParameters error when ID is not a string', async () => {
          const { err, data } = await this.testController.update({ id: 1, name: 'testClient2' });
          should.not.exist(data);
          err.should.be.instanceOf(InvalidParametersError);
        });
        it('should return InvalidParameters error when ID is not uuid', async () => {
          const { err, data } = await this.testController.update({ id: '1', name: 'testClient2' });
          should.not.exist(data);
          err.should.be.instanceof(InvalidParametersError);
        });
        it('should return DatabaseError from db layer when error occurs', async () => {
          const { err, data } = await this.testController.update({ id: this.id, name: 'testClient2' });
          should.not.exist(data);
          err.should.be.instanceof(DatabaseError);
        });
      });
    });
  });
  describe('#delete', () => {
    context('success', () => {
      beforeEach(async () => {
        const { data } = await this.testController.create({ name: 'testClient' });
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
