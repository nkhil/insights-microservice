const chai = require('chai');
const nock = require('nock');
const { errors: { InvalidParameterError, DuplicateError, ServerError } } = require('@spokedev/fab_utils');

const config = require('../../../src/config');
const clientController = require('../../../src/controllers/clients');

chai.should();

describe('Client Controller', () => {
  describe('#createClient', () => {
    context('SUCCESS: 200 response', () => {
      beforeEach(() => {
        this.createdUser = { id: 1 };
        nock(config.DAS.url)
          .post('/clients')
          .reply(200, this.createdUser);
      });
      it('should create a client', async () => {
        const data = await clientController.create({ name: 'testClient' });
        data.should.eql(this.createdUser);
      });
    });
    context('ERROR: 400 response', () => {
      beforeEach(() => {
        this.createdUser = { id: 1 };
        nock(config.DAS.url)
          .post('/clients')
          .reply(400, {});
      });
      it('should return an InvalidParametersError', async () => {
        try {
          await clientController.create({ name: 'testClient' });
          throw new Error();
        } catch (err) {
          err.should.be.instanceOf(InvalidParameterError);
        }
      });
    });
    context('ERROR: 409 response', () => {
      beforeEach(() => {
        this.createdUser = { id: 1 };
        nock(config.DAS.url)
          .post('/clients')
          .reply(409, {});
      });
      it('should return an ConflictError', async () => {
        try {
          await clientController.create({ name: 'testClient' });
          throw new Error();
        } catch (err) {
          err.should.be.instanceOf(DuplicateError);
        }
      });
    });
    context('ERROR: other response', () => {
      beforeEach(() => {
        this.createdUser = { id: 1 };
        nock(config.DAS.url)
          .post('/clients')
          .reply(403, {});
      });
      it('should return an InternalError', async () => {
        try {
          await clientController.create({ name: 'testClient' });
          throw new Error();
        } catch (err) {
          err.should.be.instanceOf(ServerError);
        }
      });
    });
  });
});
