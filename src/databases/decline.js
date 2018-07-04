const logger = require('../logger');
const { Decline } = require('../models');
const { DefaultKnexDAO } = require('./default');
const { metrics } = require('../lib');

class DeclineTransformer {
  static toDatabase(decline) {
    logger.invocation({ args: { decline } });
    if (!(decline instanceof Decline)) {
      logger.error({ message: 'decline must be an instance of decline' });
      metrics.increment('errors');
      throw new TypeError();
    }
    return {
      id: decline.id,
      rfq_id: decline.rfqId,
      market_id: decline.marketId,
      client_id: decline.clientId,
      provider_id: decline.providerId,
      reasons: JSON.stringify(decline.reasons)
    };
  }

  static fromDatabase(data) {
    logger.invocation({ args: { data } });
    return new Decline()
      .setId(data.id)
      .setRfqId(data.rfq_id)
      .setMarketId(data.market_id)
      .setClientId(data.client_id)
      .setProviderId(data.provider_id)
      .setReasons(data.reasons)
      .setCreatedOn(data.created_on);
  }
}

class DeclineDB extends DefaultKnexDAO {}

module.exports = {
  DeclineTransformer,
  DeclineDB
};
