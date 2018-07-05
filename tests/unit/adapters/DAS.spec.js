const chai = require('chai');
const nock = require('nock');

const config = require('../../../src/config');
const DASAdapter = require('../../../src/adapters/DASAdapter');
const { InvalidParameterError, DuplicateError, ServerError } = require('../../../src/errors');

chai.should();

describe('DAS Adapter', () => {
  describe('#createClient', () => {
    context('SUCCESS: 200 response', () => {
      beforeEach(() => {
        this.createdUser = { id: 1 };
        nock(config.DAS.url)
          .post('/clients')
          .reply(200, this.createdUser);
      });
      it('should create a client', async () => {
        const data = await DASAdapter.createClient({ name: 'testClient' });
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
          await DASAdapter.createClient({ name: 'testClient' });
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
          await DASAdapter.createClient({ name: 'testClient' });
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
          await DASAdapter.createClient({ name: 'testClient' });
          throw new Error();
        } catch (err) {
          err.should.be.instanceOf(ServerError);
        }
      });
    });
  });
});
