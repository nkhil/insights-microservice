const rp = require('request-promise');
const { logger, errors } = require('@spokedev/fab_utils');
const config = require('../config');

const { ServerError } = errors;

async function getFaqs() {
  logger.invocation();
  try {
    const response = await rp({
      url: `${config.DAS.url}/FAQs`,
      headers: {
        'X-IBM-Client-Id': config.DAS.clientId,
        'X-IBM-Client-Secret': config.DAS.clientSecret
      },
      method: 'GET',
      resolveWithFullResponse: true
    });
    logger.info({ message: 'Successfully Obtained FAQs' });
    return response;
  } catch (err) {
    // log error as close to occurance as possible
    logger.error({ err, message: 'Error Obtaining FAQs' });
    throw new ServerError('Something Went Wrong');
  }
}

module.exports = {
  getFaqs
};
