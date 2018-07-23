const chai = require('chai');
const nock = require('nock');

// this is required to initialise schemas
require('../../index');

const config = require('../../src/config');
const faqsRouter = require('../../src/routers/faqs');
const helpers = require('../helpers');

chai.should();

describe('faqs Router', () => {
  describe('/GET faqs', () => {
    context('ERROR: 500 response from DAS', () => {
      beforeEach(() => {
        nock(config.DAS.url)
          .get('/FAQs')
          .reply(500, {});
      });

      it('should return a 500 error', async () => {
        const request = { url: '/', method: 'GET' };
        const response = await helpers.testRouter(faqsRouter, request);
        response.statusCode.should.equal(500);
      });
    });
  });
});

describe('faqs Router', () => {
  describe('/GET faqs', () => {
    context('ERROR: internal server error', () => {
      beforeEach(() => {
        config.DAS.url = 'htp://localhost';
      });

      it('should return a 500 error', async () => {
        const request = { url: '/', method: 'GET' };
        const response = await helpers.testRouter(faqsRouter, request);
        response.statusCode.should.equal(500);
      });
    });
  });
});
