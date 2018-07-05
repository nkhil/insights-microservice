class BaseError extends Error {}

class HTTPError extends BaseError {
  constructor(message, details, statusCode) {
    super();
    this.message = message;
    this.details = details;
    this.statusCode = statusCode;
  }
}

class InvalidHTTPError extends HTTPError {
  constructor(details) {
    super('Invalid Request', details, 400);
  }
}

class ForbiddenHTTPError extends HTTPError {
  constructor(details) {
    super('Forbidden', details, 403);
  }
}

class NotFoundHTTPError extends HTTPError {
  constructor(details) {
    super('Resource Not Found', details, 404);
  }
}

class ConflictHTTPError extends HTTPError {
  constructor(details) {
    super('Conflict', details, 409);
  }
}

class InternalHTTPError extends HTTPError {
  constructor(details) {
    super('Internal Server Error', details, 500);
  }
}


// 400s
class InvalidParameterError extends InvalidHTTPError {
  constructor(details, errors) {
    super(details);
    this.errors = errors;
  }
}

// 403s
class UnAuthorisedError extends ForbiddenHTTPError {}

// 404s
class NotFoundError extends NotFoundHTTPError {}

// 409s
class DuplicateError extends ConflictHTTPError {}

// 500s
class ServerError extends InternalHTTPError {}
class DatabaseError extends InternalHTTPError {}
class UpstreamError extends InternalHTTPError {}

module.exports = {
  BaseError,
  HTTPError,
  InvalidParameterError,
  UnAuthorisedError,
  NotFoundError,
  DuplicateError,
  ServerError,
  DatabaseError,
  UpstreamError


};
