const { logger, errors } = require('@spokedev/fab_utils');
const das = require('../adapters/DASAdapter');

const { BaseError, InternalError } = errors;

async function get() {
  logger.invocation();
  try {
    return await das.getFaqs();
  } catch (err) {
    if (err instanceof BaseError) {
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
