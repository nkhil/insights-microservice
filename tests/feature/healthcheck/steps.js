// cucumber / Gherkin and chai for test steps and assertions
const { When, Then } = require('cucumber');
const chai = require('chai');

const rp = require('request-promise');
const config = require('../../config');

chai.should();

When('I call GET /ping', async () => {
  this.response = await rp({
    url: `${config.APIConnect.url}/ping`,
    method: 'GET',
    resolveWithFullResponse: true
  });
});

Then('GET /ping should return the status code, 200', async () => {
  this.response.statusCode.should.equal(200);
});

When('I call GET /ready', async () => {
  this.response = await rp({
    url: `${config.APIConnect.url}/ready`,
    method: 'GET',
    resolveWithFullResponse: true
  });
});

Then('GET /ready should return the status code, 200', async () => {
  this.response.statusCode.should.equal(200);
});