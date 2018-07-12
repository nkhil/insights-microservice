const { logger, errors, metrics } = require('@spokedev/fab_utils');
const DASAdapter = require('../adapters/DASAdapter');

const { BaseError, InternalError } = errors;


async function create(client) {
  logger.invocation({ args: { client } });
  metrics.increment('clients');
  try {
    const saveValue = await DASAdapter.createClient(client);
    logger.debug({ msg: 'Successfully Created Client' });
    return saveValue;
  } catch (err) {
    if (err instanceof BaseError) {
      // debug as error logged at DAS layer.
      logger.debug({ msg: 'Error From DAS Adapter. Returning' });
      throw err;
    }
    // it's important to put the error/message into the object as err/msg here.
    // errors are logged when they occur
    logger.error({ err, msg: 'Unhandled Error From DAS Adapter' });
    throw new InternalError();
  }
}

module.exports = {
  create
};
