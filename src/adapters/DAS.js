const rp = require('request-promise');
const logger = require('../lib');
const config = require('../config');
const { InvalidParametersError, InternalError, ConflictError } = require('../errors');

async function createClient(client) {
  try {
    const response = await rp({
      url: `${config.DAS.url}/clients`,
      method: 'POST',
      body: client
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
        throw new InvalidParametersError();
      case (403):
        // this shouldn't happen in production so we raise a fatal log!!
        logger.fatal({ msg: 'DAS Returned Authorization Error' });
        throw new InternalError();
      case (409):
        throw new ConflictError();
      default :
        throw new InternalError();
    }
  }
}

module.exports = {
  createClient
};
