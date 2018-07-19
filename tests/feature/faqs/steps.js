/* eslint-disable no-console */

// cucumber / Gherkin and chai for test steps and assertions
const { Given, When, Then } = require('cucumber');
const chai = require('chai');

// nock to stub out external dependencies for local unit testing
const nock = require('nock');
const faqsList = require('../../responses/faqs');

// router and helpers for local unit testing invokation
const faqRouter = require('../../../src/routers/faqs');
const helpers = require('../../helpers');

// standard component (microservice) config
const config = require('../../../src/config');

chai.should();

Given('The Data Access Service GET FAQs is available', async () => {
  // if (process.env.TEST_MODE === 'COMPONENT') {
  //   // in COMPONENT mode we're going to call the router directly,
  //   // so we need to setup the external dependencies
  //   console.log('TEST_EXEC: Setting up DAS dependencies for component execution');
  //   const response = faqsList;
  //   nock(config.DAS.url)
  //     .get('/FAQs')
  //     .reply(200, response);
  // }
});

When('I call the Getting Started microservice GET /faqs route', async () => {
  // the local route is at / because we're calling the router directly
  // and the APIConnect route is at /faqs
  this.response = await helpers.get(faqRouter, '/', '/faqs');
});

Then('The Getting Started GET /faqs route should return the status code, 200', async () => {
  this.response.statusCode.should.equal(200);
});

Then('The Getting Started GET /faqs route should return a list of faqs or No Entries Found', async () => {
  const body = JSON.parse(this.response.body);
  if ('message' in body) {
    body.message.should.equal('No Entries Found');
  } else {
    body.should.be.instanceOf(Array);
  }
});
