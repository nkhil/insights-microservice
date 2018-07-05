const CLS = require('cls-hooked');
const uuid = require('uuid/v4');
const constants = require('../constants');
const logger = require('../logger');
const { Schema, ValidationError, SchemaNotFoundError } = require('../lib/schema');
const {
  RESTError
} = require('../errors');

const tracking = CLS.createNamespace(constants.TRACKING_NAMESPACE);
const schema = new Schema(`${__dirname}/../schemas`);

exports.parseExceptionCatcher = () => async (err, req, res, next) => {
  logger.info({ message: 'Unknown Error Parsing Body' });
  req.body = null;
  next();
};

exports.tracking = () => async (req, res, next) => {
  tracking.run(() => next());
};

exports.requestInit = () => async (req, res, next) => {
  const requestId = req.headers[constants.CORRELATION_HEADER] || uuid();
  const executionId = uuid();

  tracking.set('requestId', requestId);
  tracking.set('executionId', requestId);
  res.set('x-request-id', requestId);

  logger.new({ requestId, executionId });
  logger.debug({ req });
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
        error = new RESTError({
          message: 'Invalid request',
          status: 400,
          description: 'See Errors',
          errors: err.errors
        });
        break;
      case (err instanceof SchemaNotFoundError):
        logger.debug({ name: 'middlewares', fn: 'schemacheck', message: 'schema not found' });
        error = new RESTError({
          message: 'Internal Server Error',
          description: 'Unknown Error Occured',
          status: 500
        });
        break;
      default:
        error = err;
    }
    return next(error);
  }
  logger.debug({ message: 'schema validation passed' });
  return next();
};

exports.logsClose = () => async (req, res, next) => {
  logger.debug({ res });
  logger.info({
    method: req.method,
    path: req.path,
    status_code: res.statusCode,
    remoteAddress: req.connection.remoteAddress,
    remotePort: req.connection.remotePort,
    type: 'API_CALL'
  });
  next();
};

exports.defaultErrorHandler = () => (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  if (!(err instanceof RESTError)) {
    res.status(500).json({ message: 'Internal Server Error', description: 'Unknown Error Occured' });
  } else {
    res.status(err.status).json({
      message: err.message,
      description: err.description,
      errors: err.errors
    });
  }
  return next();
};
