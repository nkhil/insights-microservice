const logger = require('../logger');
const { Provider } = require('../../src/models/provider');
const { RevisionsKnexDAO } = require('./revisions');
const { metrics } = require('../lib');

class ProviderTransformer {
  static toDatabase(provider) {
    logger.invocation({ args: { provider } });
    if (!(provider instanceof Provider)) {
      logger.error({ message: 'provider must be instance of Provider' });
      metrics.increment('errors');
      throw new TypeError();
    }
    return {
      revision: {
        id: provider.revisionId,
        provider_id: provider.id,
        description: provider.description,
        webhook_url: provider.webhookUrl,
        webhook_headers: JSON.stringify(provider.webhookHeaders),
        filter_schema: JSON.stringify(provider.filterSchema),
        image_url: provider.imageUrl,
        locations: JSON.stringify(provider.locations)
      },
      main: {
        id: provider.id,
        market_id: provider.marketId,
        name: provider.name,
        revision_id: provider.revisionId
      }
    };
  }

  static fromDatabase(data) {
    logger.invocation({ args: { data } });
    return new Provider()
      .setId(data.id)
      .setRevisionId(data.revision_id)
      .setName(data.name)
      .setDescription(data.description)
      .setMarketId(data.market_id)
      .setWebhookURL(data.webhook_url)
      .setWebhookHeaders(data.webhook_headers)
      .setFilterSchema(data.filter_schema)
      .setImageUrl(data.image_url)
      .setLocations(data.locations)
      .setCreatedOn(data.created_on)
      .setUpdatedOn(data.updated_on);
  }
}

class ProviderDB extends RevisionsKnexDAO {}

module.exports = {
  ProviderTransformer,
  ProviderDB
};
