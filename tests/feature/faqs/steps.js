// cucumber / Gherkin and chai for test steps and assertions
const { When, Then } = require('cucumber');
const chai = require('chai');

const rp = require('request-promise');
const config = require('../../config');

chai.should();

When('I call the Getting Started microservice GET /faqs route', async () => {
  this.response = await rp({
    url: `${config.APIConnect.url}/faqs`,
    headers: {
      'X-IBM-Client-Id': config.APIConnect.clientId,
      'X-IBM-Client-Secret': config.APIConnect.clientSecret
    },
    method: 'GET',
    resolveWithFullResponse: true
  });
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
