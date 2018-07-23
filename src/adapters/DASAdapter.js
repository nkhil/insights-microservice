const rp = require('request-promise');
const { logger, errors } = require('@spokedev/fab_utils');
const config = require('../config');

const { InvalidParameterError, DuplicateError, ServerError } = errors;

async function createClient(client) {
  logger.invocation({ args: { client } });
  try {
    const response = await rp({
      url: `${config.DAS.url}/clients`,
      method: 'POST',
      body: client,
      json: true
    });
    // assume 200 response = success
    logger.info({ message: 'Successfully Created Client' });
    return response;
  } catch (err) {
    // log error as close to occurance as possible
    logger.error({ err, message: 'Error Creating Client' });
    // handle error cases as needed
    switch (err.statusCode) {
      case (400):
        throw new InvalidParameterError('Invalid Params');
      case (409):
        throw new DuplicateError('Client Already Exists');
      default:
        throw new ServerError('Something Went Wrong');
    }
  }
}


module.exports = {
  createClient
};
