class AuthenticationError {
  constructor(message) {
    this.message = message || 'no message';
  }
}

class TokenSigningError extends AuthenticationError {}
class TokenExpiredError extends AuthenticationError {}
class TokenInvalidError extends AuthenticationError {}
class URLValidationError extends AuthenticationError {}

module.exports = {
  AuthenticationError,
  TokenSigningError,
  TokenExpiredError,
  TokenInvalidError,
  URLValidationError
};
