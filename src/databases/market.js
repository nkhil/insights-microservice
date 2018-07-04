const logger = require('../logger');
const { Market } = require('../models');
const { RevisionsKnexDAO } = require('./revisions');
const { metrics } = require('../lib');

class MarketTransformer {
  static toDatabase(market) {
    logger.invocation({ args: { market } });
    if (!(market instanceof Market)) {
      logger.error({ message: 'market must be instance of Market' });
      metrics.increment('errors');
      throw new TypeError();
    }
    return {
      revision: {
        id: market.revisionId,
        market_id: market.id,
        description: market.description,
        image_url: market.imageUrl,
        active: market.isActive,
        is_lit: market.lit,
        rfq_default_lifespan: market.rfqDefaultLifespan,
        rfq_close_on_accept: market.rfqCloseOnAccept,
        rfq_schema: JSON.stringify(market.rfqSchema),
        quote_schema: JSON.stringify(market.quoteSchema),
        acceptance_schema: JSON.stringify(market.acceptanceSchema),
        completion_schema: JSON.stringify(market.completionSchema)
      },
      main: {
        id: market.id,
        name: market.name,
        revision_id: market.revisionId
      }
    };
  }

  static fromDatabase(data) {
    logger.invocation({ args: { data } });
    return new Market()
      .setId(data.market_id)
      .setRevisionId(data.revision_id)
      .setName(data.name)
      .setDescription(data.description)
      .setImageUrl(data.image_url)
      .setIsActive(data.active)
      .setLit(data.is_lit)
      .setRfqDefaultLifespan(data.rfq_default_lifespan)
      .setRfqCloseOnAccept(data.rfq_close_on_accept)
      .setRfqSchema(data.rfq_schema)
      .setQuoteSchema(data.quote_schema)
      .setAcceptanceSchema(data.acceptance_schema)
      .setCompletionSchema(data.completion_schema)
      .setCreatedOn(data.created_on)
      .setUpdatedOn(data.updated_on);
  }
}

class MarketDB extends RevisionsKnexDAO {}

module.exports = {
  MarketTransformer,
  MarketDB
};
