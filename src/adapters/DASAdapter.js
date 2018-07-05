const rp = require('request-promise');
const logger = require('../logger');
const config = require('../config');
const { InvalidParametersError, InternalError, ConflictError } = require('../errors');

async function createClient(client) {
  try {
    const response = await rp({
      url: `${config.DAS.url}/clients`,
      method: 'POST',
      body: client,
      json: true
    });
      // assume 200 response = success
    logger.info({ msg: 'Successfully Created Client' });
    return response;
  } catch (err) {
    // log error as close to occurance as possible
    logger.error({ err, msg: 'Error Creating Client' });
    // handle error cases as needed
    switch (err.statusCode) {
      case (400):
        throw new InvalidParametersError('Invalid Params');
      case (409):
        throw new ConflictError('Client Already Exists');
      default:
        throw new InternalError('Something Went Wrong');
    }
  }
}


module.exports = {
  createClient
};
