const Promise = require('bluebird');
const { authController } = require('../../src/controllers');
const { TokenInvalidError } = require('../../src/errors');

class TokenGenerator {
  constructor() {
    this.token = null;
  }

  async create({ userType, userId, marketId }) {
    if (!userType) throw new Error('Missing required parameter userType');
    const payload = { userType };
    if (payload.userType !== 'superAdmin' ||
        payload.userType !== 'admin') {
      payload.marketId = marketId;
    }
    if (payload.userType === 'client' ||
        payload.userType === 'provider') {
      payload.userId = userId;
    }
    ({ data: this.token } = await authController.create(payload));
    return this.token;
  }
}

class MockGenerator {
  constructor(setFailed = false) {
    this.token = null;
    this.setFailed = setFailed;
  }

  async create({ permissions }) {
    this.token = new Buffer(JSON.stringify(permissions));
    if (this.setFailed) return Promise.reject({ err: new TokenInvalidError(), data: null });
    return Promise.resolve({ err: null, data: this.token.toString('base64') });
  }

  async validate({ token }) {
    this.token = new Buffer(token, 'base64');
    if (this.setFailed) return Promise.reject({ err: new TokenInvalidError(), data: null });
    return Promise.resolve({ err: null, data: JSON.parse(this.token.toString('utf-8')) });
  }
}

module.exports = {
  tokenGenerator: new TokenGenerator(),
  MockGenerator
};
