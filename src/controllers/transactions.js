const { transactions } = require('../adapters');
const { ServiceError } = require('../errors');

const list = async () => {
  try {
    const trxs = await transactions.list();
    return trxs;
  } catch (err) {
    // only log the error if it hasn't already been caught and logged
    let error = err;
    if (!(err instanceof ServiceError)) {
      console.log({ err: err.message, message: 'Internal Server Error' });
      error = new ServiceError(err);
    }
    throw error;
  }
};

module.exports = {
  list
};
