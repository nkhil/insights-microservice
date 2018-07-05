const { When } = require('cucumber');
const rp = require('request-promise');

const targetURL = process.env.targetURL || 'http://localhost:4000';

When('I create a client', async () => {
  try {
    const client = await rp({
      url: targetURL,
      method: 'POST',
      body: {},
      json: true
    });
    return client;
  } catch (err) {
    throw err;
  }
});
