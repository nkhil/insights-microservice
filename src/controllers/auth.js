const logger = require('../logger');
const { MissingParametersError } = require('../errors');
const { metrics } = require('../lib');

class AuthController {
  constructor(authenticator) {
    this.auth = authenticator;
  }

  async create({ userId, userType, marketId }) {
    logger.invocation({ args: { userId, userType, marketId } });
    let error;
    if (!userType) {
      logger.error({ message: 'userType is mandatory field' });
      metrics.increment('errors');
      error = new MissingParametersError();
    }

    const payload = { userType };
    if (payload.userType !== 'superAdmin' ||
        payload.userType !== 'admin') {
      payload.marketId = marketId;
    }
    if (payload.userType === 'client' ||
        payload.userType === 'provider') {
      payload.userId = userId;
    }
    if (error) return { err: error, data: null };

    const { err, data } = await this.auth.create({ permissions: payload });

    if (err) {
      logger.debug({ message: 'error from Authentication class' });
      return { err, data: null };
    }

    return { err: null, data };
  }
}

module.exports = {
  AuthController
};
