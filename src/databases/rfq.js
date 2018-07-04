const { Rfq } = require('../models');
const { DefaultKnexDAO } = require('./default');
const logger = require('../logger');
const { metrics } = require('../lib');

class RfqTransformer {
  static toDatabase(rfq) {
    logger.invocation({ args: { rfq } });
    if (!(rfq instanceof Rfq)) {
      logger.error({ message: 'rfq should be instance of Rfq' });
      metrics.increment('errors');
      throw new TypeError();
    }
    return {
      id: rfq.id,
      payload: JSON.stringify(rfq.payload),
      request_group: JSON.stringify(rfq.requestGroup),
      client_id: rfq.clientId,
      market_id: rfq.marketId,
      on_behalf_of: rfq.onBehalfOf,
      lifespan: rfq.lifespan
    };
  }

  static fromDatabase(data) {
    logger.invocation({ args: { data } });
    return new Rfq()
      .setId(data.id)
      .setPayload(data.payload)
      .setRequestGroup(data.request_group)
      .setClientId(data.client_id)
      .setMarketId(data.market_id)
      .setLifespan(data.lifespan)
      .setOnBehalfOf(data.on_behalf_of)
      .setCreatedOn(data.created_on);
  }
}

class RfqDB extends DefaultKnexDAO {}

module.exports = {
  RfqTransformer,
  RfqDB
};
