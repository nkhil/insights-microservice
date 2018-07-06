const chai = require('chai');
const nock = require('nock');
const { errors: { InvalidParameterError, DuplicateError, ServerError } } = require('@spokedev/fab_utils');

// this is required to initialise schemas
require('../../../index');

const config = require('../../../src/config');
const clientRouter = require('../../../src/routers/clients');
const helpers = require('../helpers');

chai.should();

describe('Client Router', () => {
  describe('/POST clients', () => {
    context('SUCCESS: 201 response', () => {
      beforeEach(() => {
        this.createdUser = { id: 1 };
        nock(config.DAS.url)
          .post('/clients')
          .reply(200, this.createdUser);
      });


      it('should create a client', async () => {
        const request = { url: '/', method: 'POST', body: { name: 'tom ' } };
        const response = await helpers.testRouter(clientRouter, request);
        response.statusCode.should.equal(201);
        response.location.should.equal('/clients/1');
        response.body.should.eql(this.createdUser);
      });
    });

    context('ERROR: 400 response from DAS', () => {
      beforeEach(() => {
        this.createdUser = { id: 1 };
        nock(config.DAS.url)
          .post('/clients')
          .reply(400, {});
      });

      it('should return a 400 error', async () => {
        try {
          const request = { url: '/', method: 'POST', body: { name: 'tom' } };
          await helpers.testRouter(clientRouter, request);
          throw new Error();
        } catch (err) {
          err.should.be.instanceOf(InvalidParameterError);
        }
      });
    });

    context('ERROR: 409 response from DAS', () => {
      beforeEach(() => {
        this.createdUser = { id: 1 };
        nock(config.DAS.url)
          .post('/clients')
          .reply(409, {});
      });

      it('should return a 409 error', async () => {
        try {
          const request = { url: '/', method: 'POST', body: { name: 'tom' } };
          await helpers.testRouter(clientRouter, request);
          throw new Error();
        } catch (err) {
          err.should.be.instanceOf(DuplicateError);
        }
      });
    });

    context('ERROR: other response from DAS', () => {
      beforeEach(() => {
        this.createdUser = { id: 1 };
        nock(config.DAS.url)
          .post('/clients')
          .reply(403, {});
      });

      it('should return a 500 error', async () => {
        try {
          const request = { url: '/', method: 'POST', body: { name: 'tom' } };
          await helpers.testRouter(clientRouter, request);
          throw new Error();
        } catch (err) {
          err.should.be.instanceOf(ServerError);
        }
      });
    });

    context('ERROR: 400 response from schema', () => {
      beforeEach(() => {
        this.createdUser = { id: 1 };
        nock(config.DAS.url)
          .post('/clients')
          .reply(400, {});
      });

      it('should return a 400 error', async () => {
        try {
          const request = { url: '/', method: 'POST', body: { nom: 'tom' } };
          await helpers.testRouter(clientRouter, request);
          throw new Error();
        } catch (err) {
          err.should.be.instanceOf(InvalidParameterError);
        }
      });
    });
  });
});
