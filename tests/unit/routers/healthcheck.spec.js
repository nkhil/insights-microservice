const chai = require('chai');

const router = require('../../../src/routers/healthcheck');
const helpers = require('../helpers');

chai.should();

describe('Default Router', () => {
  describe('/GET ping', () => {
    context('SUCCESS: 200 response', () => {
      it('should return success', async () => {
        const request = { url: '/ping', method: 'GET', connection: {} };
        const response = await helpers.testRouter(router, request);
        response.statusCode.should.equal(200);
      });
    });
  });
  describe('/GET ready', () => {
    context('SUCCESS: 200 response', () => {
      it('should return success', async () => {
        const request = { url: '/ready', method: 'GET', connection: {} };
        const response = await helpers.testRouter(router, request);
        response.statusCode.should.equal(200);
      });
    });
  });
});
