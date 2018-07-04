const logger = require('../logger');
const {
  BaseError,
  ConnectionError,
  DuplicateError,
  DatabaseError,
  InvalidParametersError,
  MissingParametersError
} = require('../errors');

class ErrorChecker {
  static getDbError(err) {
    let error = err;
    if (error instanceof BaseError) return error;
    switch (error.code) {
      case ('ECONNREFUSED'):
        logger.info({ message: `Unable to connect to DB: ${err.message}` });
        error = new ConnectionError();
        break;
      case ('23505'):
        error = new DuplicateError();
        break;
      case ('23502'):
        error = new MissingParametersError();
        break;
      case ('08P01'):
      case ('XX000'):
      case ('42703'):
      case ('22003'):
        error = new InvalidParametersError();
        break;
      case ('42P01'):
        logger.info({ message: `Database table missing: ${err.message}` });
        error = new DatabaseError();
        break;
      default:
        logger.debug({
          message: `Uncaught db error with status code ${err.code}. Full message: ${err.message}`
        });
        error = new DatabaseError();
    }
    return error;
  }
}

module.exports = ErrorChecker;
