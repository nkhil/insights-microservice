const logger = require('../logger');
const { MissingParametersError } = require('../errors');
const { metrics } = require('../lib');

class Authentication {
  constructor({ generator }) {
    this.generator = generator;
  }

  async validate({ token }) {
    logger.invocation({ args: { token } });

    if (!token) {
      logger.error({ message: 'token is mandatory field' });
      metrics.increment('errors');
      return { err: new MissingParametersError(), data: null };
    }

    const { err, data } = await this.generator.validate({ token });
    if (err) {
      logger.debug({ message: 'Error from generator.validate()' });
      return { err, data };
    }
    return { err, data };
  }

  async create({ permissions }) {
    logger.invocation({ args: { permissions } });

    if (!permissions) {
      logger.error({ message: 'permissions is mandatory field' });
      metrics.increment('errors');
      return { err: new MissingParametersError(), data: null };
    }

    const { err, data } = await this.generator.create({ permissions });
    if (err) {
      logger.debug({ message: 'Error from generator.create()' });
      return { err, data };
    }

    return { err, data };
  }
}

module.exports = Authentication;
