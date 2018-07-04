const logger = require('../logger');
const { Quote } = require('../models');
const { RevisionsKnexDAO } = require('./revisions');
const { metrics } = require('../lib');

class QuoteTransformer {
  static toDatabase(quote) {
    logger.invocation({ args: { quote } });
    if (!(quote instanceof Quote)) {
      logger.error({ message: 'quote must be an instance of Quote' });
      metrics.increment('errors');
      throw new TypeError();
    }
    return {
      main: {
        id: quote.id,
        revision_id: quote.revisionId,
        rfq_id: quote.rfqId,
        market_id: quote.marketId,
        client_id: quote.clientId,
        provider_id: quote.providerId,
        payload: JSON.stringify(quote.payload),
        lifespan: quote.lifespan,
        on_behalf_of: quote.onBehalfOf
      },
      revision: {
        id: quote.revisionId,
        quote_id: quote.id,
        status: quote.status,
        acceptance: JSON.stringify(quote.acceptance),
        completion: JSON.stringify(quote.completion)
      }
    };
  }

  static fromDatabase(data) {
    logger.invocation({ args: { data } });
    return new Quote()
      .setId(data.quote_id)
      .setRevisionId(data.revision_id)
      .setRfqId(data.rfq_id)
      .setMarketId(data.market_id)
      .setClientId(data.client_id)
      .setProviderId(data.provider_id)
      .setPayload(data.payload)
      .setLifespan(data.lifespan)
      .setStatus(data.status)
      .setAcceptance(data.acceptance)
      .setCompletion(data.completion)
      .setCreatedOn(data.created_on)
      .setUpdatedOn(data.updated_on);
  }
}

class QuoteDB extends RevisionsKnexDAO {}

module.exports = {
  QuoteTransformer,
  QuoteDB
};
