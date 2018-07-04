const jwt = require('jsonwebtoken');
const config = require('../../config').auth;
const Promise = require('bluebird');
const {
  TokenSigningError,
  TokenExpiredError,
  TokenInvalidError
} = require('../../errors');

const jwtVerifyToken = Promise.promisify(jwt.verify);
const jwtSignToken = Promise.promisify(jwt.sign);

class JwtGenerator {
  constructor() {
    this.secret = config.secret;
    this.expiry = Math.floor((Date.now() + config.tokenExpiry) / 1000);
  }

  async create({ permissions }) {
    let token;
    try {
      token = await jwtSignToken({ permissions, exp: this.expiry }, this.secret);
    } catch (e) {
      return { err: new TokenSigningError(), data: null };
    }

    return { err: null, data: token };
  }

  async validate({ token }) {
    let decode;
    try {
      decode = await jwtVerifyToken(token, this.secret);
    } catch (err) {
      let error;
      switch (true) {
        case (err.message.includes('jwt expired')):
          error = new TokenExpiredError();
          break;
        default:
          error = new TokenInvalidError();
      }
      return { err: error, data: null };
    }
    return { err: null, data: decode };
  }
}

module.exports = JwtGenerator;
