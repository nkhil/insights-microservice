// cucumber / Gherkin and chai for test steps and assertions
const { When, Then } = require('cucumber');
const chai = require('chai');
const rp = require('request-promise');
const config = require('../../config');

chai.should();

When('I call GET /ping', async () => {
  this.response = await rp({
    url: `${config.thisService.url}/healthcheck/ping`,
    method: 'GET',
    resolveWithFullResponse: true
  });
});

Then('GET /ping should return the status code, 200', async () => {
  this.response.statusCode.should.equal(200);
});
