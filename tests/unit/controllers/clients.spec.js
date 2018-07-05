const chai = require('chai');
const clientsController = require('../../../src/controllers/clients');

const should = chai.should();

describe('client controller', () => {
  describe('#create', () => {
    context('success', () => {
      it('should create a client', async () => {
        const { err, data } = await clientsController.create({ name: 'testClient' });
        should.not.exist(err);
        data.id.should.equal(1);
      });
    });
  });
  describe('#get by id', () => {
    context('success', () => {
      it('should return a client', async () => {
        const { err, data } = await clientsController.get(1);
        should.not.exist(err);
        data.name.should.equal('sample');
      });
    });
  });
});
