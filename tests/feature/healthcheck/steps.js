// cucumber / Gherkin and chai for test steps and assertions
const { When, Then } = require('cucumber');
const chai = require('chai');

// router and helpers for local unit testing invokation
const healthcheckRouter = require('../../../src/routers/healthcheck');
const helpers = require('../../helpers');

chai.should();

When('I call GET /ping', async () => {
  this.response = await helpers.get(healthcheckRouter, '/ping');
});

Then('GET /ping should return the status code, 200', async () => {
  this.response.statusCode.should.equal(200);
});

When('I call GET /ready', async () => {
  this.response = await helpers.get(healthcheckRouter, '/ready');
});

Then('GET /ready should return the status code, 200', async () => {
  this.response.statusCode.should.equal(200);
});
