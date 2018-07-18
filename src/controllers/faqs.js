const { logger, errors } = require('@spokedev/fab_utils');
const das = require('../adapters/DASAdapter');

const { BaseError, InternalError } = errors;

async function get() {
  logger.invocation();
  try {
    const response = await das.getFaqs();
    logger.debug({ message: 'Obtained faqs' });
    return response;
  } catch (err) {
    if (err instanceof BaseError) {
      // debug as error logged at DAS layer.
      logger.debug({ message: 'Error From DAS Adapter. Returning' });
      throw err;
    }
    // it's important to put the error/message into the object as err/message here.
    // errors are logged when they occur
    logger.error({ err, message: 'Unhandled Error From DAS Adapter' });
    throw new InternalError();
  }
}

module.exports = {
  get
};
