const CLS = require('cls-hooked');
const uuid = require('uuid/v4');
const constants = require('../constants');
const mask = require('json-mask');
const logger = require('../logger');
const { authentication } = require('../authentication');
const { roles } = require('../config');
const { Schema, ValidationError, SchemaNotFoundError } = require('../schema');
const {
  RESTError,
  TokenExpiredError,
  TokenInvalidError,
  UnauthorizedError
} = require('../errors');
const { metrics } = require('../lib');

const policies = require('../static/policies');


const tracking = CLS.createNamespace(constants.TRACKING_NAMESPACE);
const schema = new Schema(`${__dirname}/../static/schemas`);

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

exports.authenticate = () => async (req, res, next) => {
  logger.invocation({ args: {} });
  if (!(req.get('Authorization'))) {
    logger.error({ message: 'Missing \'Authorization\' header' });
    metrics.increment('errors');
    return next(new RESTError({
      message: 'Unauthorized',
      description: 'Missing \'Authorization\' header',
      status: 401
    }));
  }
  if (!(req.get('Authorization').includes('Bearer ', 0))) {
    logger.error({ message: 'Missing Bearer access token type: \'Bearer <TOKEN>\'' });
    metrics.increment('errors');
    return next(new RESTError({
      message: 'Unauthorized',
      description: 'Missing Bearer access token type: \'Bearer <TOKEN>\'',
      status: 401
    }));
  }
  const token = req.get('Authorization').split(' ')[1];
  if (!token) {
    logger.error({ message: 'Missing Bearer access token type: \'Bearer <TOKEN>\'' });
    metrics.increment('errors');
    return next(new RESTError({
      message: 'Unauthorized',
      description: 'Missing Bearer access token type: \'Bearer <TOKEN>\'',
      status: 401
    }));
  }

  const { err, data } = await authentication.validate({ token });
  if (err) {
    let error;
    switch (true) {
      case (err instanceof TokenExpiredError):
        error = new RESTError({
          message: 'Forbidden',
          description: 'Authorization token has expired, please renew your token',
          status: 403
        });
        break;
      case (err instanceof TokenInvalidError):
        error = new RESTError({
          message: 'Unauthorized',
          description: 'Authorization token is malformed/content is invalid',
          status: 401
        });
        break;
      case (err instanceof UnauthorizedError):
        error = new RESTError({
          message: 'Forbidden',
          description: 'Access denied. You are not authorized to access this resource',
          status: 403
        });
        break;
      default:
        error = err;
    }
    return next(error);
  }

  // check if token payload is valid
  switch (true) {
    case (data.permissions === undefined):
    case (data.permissions.userType === undefined):
      return next(new RESTError({
        message: 'Unauthorized',
        description: 'Authorization token content is invalid',
        status: 401
      }));
    default:
      req.auth = { userType: data.permissions.userType };
  }

  if (data.permissions.userType === roles.marketAdmin ||
      data.permissions.userType === roles.clientAdmin ||
      data.permissions.userType === roles.providerAdmin) {
    if (data.permissions.marketId === undefined) {
      return next(new RESTError({
        message: 'Unauthorized',
        description: 'Authorization token content is invalid',
        status: 401
      }));
    }
    req.auth.marketId = data.permissions.marketId;
  }

  if (data.permissions.userType === roles.client ||
      data.permissions.userType === roles.provider) {
    if (data.permissions.marketId === undefined) {
      return next(new RESTError({
        message: 'Unauthorized',
        description: 'Authorization token content is invalid',
        status: 401
      }));
    }
    req.auth.marketId = data.permissions.marketId;
    if (data.permissions.userId === undefined) {
      return next(new RESTError({
        message: 'Unauthorized',
        description: 'Authorization token content is invalid',
        status: 401
      }));
    }
    req.auth.userId = data.permissions.userId;
  }
  return next();
};

exports.setOffsetLimit = () => async (req, res, next) => {
  if (typeof req.query.offset !== 'undefined') {
    switch (true) {
      case (isNaN(parseInt(req.query.offset, 10))):
      case (Number(req.query.offset) % 1 !== 0):
        return next(new RESTError({
          message: 'Bad Request',
          description: 'invalid offset value',
          status: 400
        }));
      default:
        req.query.offset = parseInt(req.query.offset, 10);
    }
    if (req.query.offset < 0) {
      return next(new RESTError({
        message: 'Bad Request',
        description: 'Invalid offset value, should be greater than 0',
        status: 400
      }));
    }
  }
  if (typeof req.query.limit !== 'undefined') {
    switch (true) {
      case (isNaN(parseInt(req.query.limit, 10))):
      case (Number(req.query.limit) % 1 !== 0):
        return next(new RESTError({
          message: 'Bad Request',
          description: 'invalid limit value',
          status: 400
        }));
      default:
        req.query.limit = parseInt(req.query.limit, 10);
    }
    if (req.query.limit <= 0 || req.query.limit > 1000) {
      return next(new RESTError({
        message: 'Bad Request',
        description: 'Invalid limit value, should be between 1 and 1000',
        status: 400
      }));
    }
  }
  return next();
};

exports.checkAccess = ({ accessRoles }) => async (req, res, next) => {
  const hasAccess = accessRoles.find(accessRole => accessRole === req.auth.userType);

  if (!hasAccess) {
    logger.debug({ message: `User type, ${req.auth.userType} denied access.` });
    return next(new RESTError({
      message: 'Forbidden',
      description: 'Access denied. You are not authorized to access this resource',
      status: 403
    }));
  }

  return next();
};

exports.filterResponse = () => async (req, res, next) => {
  const oldJSON = res.json;
  res.json = (responseBody) => {
    if (responseBody.message || responseBody.errors || responseBody.status) {
      return oldJSON.apply(res, [responseBody]);
    }
    const { data } = policies.find({
      user: req.auth.userType,
      route: `${req.baseUrl}${req.route.path}`,
      method: req.method
    });
    const masked = mask(responseBody, data);
    return oldJSON.apply(res, [masked]);
  };
  next();
};
