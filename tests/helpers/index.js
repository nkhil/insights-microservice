// standard logger
const { logger } = require('@spokedev/fab_utils');

// request-promise for feature testing via API Connect
const rp = require('request-promise');

// test execution config
const config = require('../config');

class ResponseStub {
  status(status) {
    this.statusCode = status;
    return this;
  }

  location(location) {
    this.location = location;
    return this;
  }

  json(body) {
    this.body = JSON.stringify(body);
    return this;
  }

  end() {
    return this;
  }
}

async function testRouter(router, request) {
  const response = new ResponseStub();
  return new Promise((resolve, reject) => {
    router.handle(request, response, (error) => {
      if (error) {
        reject(error);
      }
      resolve(response);
    });
  });
}

async function get(router, url, prodUrl) {
  let response;
  if (process.env.TEST_MODE === 'COMPONENT') {
    // call the router directly
    logger.info({ message: `TEST_EXEC: Calling the router internally at ${url}` });
    const request = { url, method: 'GET' };
    response = await testRouter(router, request);
    logger.info({ message: `TEST_EXEC: Response from router ===> ${response}` });
  } else {
    // call the router externally (via API connect)
    const apiUrl = prodUrl || url;
    logger.info({ message: `TEST_EXEC: Calling the api externally via URL: ${config.APIConnect.url}${apiUrl}` });
    response = await rp({
      url: `${config.APIConnect.url}${apiUrl}`,
      headers: {
        'X-IBM-Client-Id': config.APIConnect.clientId,
        'X-IBM-Client-Secret': config.APIConnect.clientSecret
      },
      method: 'GET',
      resolveWithFullResponse: true
    });
    logger.info({ message: `TEST_EXEC: Response from router ===> ${response.statusCode}, ${response.body}` });
  }
  return response;
}

module.exports = {
  testRouter,
  get
};
