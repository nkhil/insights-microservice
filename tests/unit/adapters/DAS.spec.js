const chai = require('chai');
const nock = require('nock');
const chaiAsPromised = require('chai-as-promised');

const config = require('../../../src/config');
const DASAdapter = require('../../../src/adapters/DASAdapter');
const { InvalidParameterError, DuplicateError, ServerError } = require('../../../src/errors');

chai.should();
chai.use(chaiAsPromised);

describe('DAS Adapter', () => {
  describe('#createClient', () => {
    context('success', () => {
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
    context('400 response', () => {
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
    context('409 response', () => {
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
    context('Other Error response', () => {
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
