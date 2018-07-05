const { logger } = require('@spokedev/fab_logger');
const {
  Schema,
  ValidationError,
  SchemaNotFoundError,
  BaseError
} = require('@spokedev/fab_schema_validator');

const { ServerError, InvalidParameterError } = require('../errors');

const schema = new Schema(`${__dirname}/../schemas`);

exports.parseExceptionCatcher = () => async (err, req, res, next) => {
  logger.info({ message: 'Unknown Error Parsing Body' });
  req.body = null;
  next();
};

exports.schemaCheck = schemaName => async (req, res, next) => {
  logger.invocation({ args: { req } });
  const { err } = await schema.validate(schemaName, req.body);
  if (err) {
    logger.debug({ message: 'schema validation failed' });
    let error;
    switch (true) {
      case (err instanceof ValidationError):
        error = new InvalidParameterError('See Errors', err.errors);
        break;
      case (err instanceof SchemaNotFoundError):
        logger.debug({ name: 'middlewares', fn: 'schemacheck', message: 'schema not found' });
        error = new ServerError('Schema Not Found');
        break;
      default:
        error = err;
    }
    return next(error);
  }
  logger.debug({ message: 'schema validation passed' });
  return next();
};

exports.defaultErrorHandler = () => (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  if (!(err instanceof BaseError)) {
    res.status(500).json({ message: 'Internal Server Error', description: 'Unknown Error Occured' });
  } else {
    res.status(err.statusCode).json({
      message: err.message,
      details: err.details,
      errors: err.errors
    });
  }
  return next();
};
