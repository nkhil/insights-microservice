const logger = require('../logger');
const { Client } = require('../models');
const { RevisionsKnexDAO } = require('./revisions');
const { metrics } = require('../lib');

class ClientTransformer {
  static toDatabase(client) {
    logger.invocation({ args: { client } });
    if (!(client instanceof Client)) {
      logger.error({ message: 'client must be instance of Client' });
      metrics.increment('errors');
      throw new TypeError();
    }
    return {
      revision: {
        id: client.revisionId,
        client_id: client.id,
        description: client.description,
        webhook_url: client.webhookUrl,
        webhook_headers: JSON.stringify(client.webhookHeaders)
      },
      main: {
        id: client.id,
        name: client.name,
        market_id: client.marketId,
        revision_id: client.revisionId
      }
    };
  }

  static fromDatabase(data) {
    logger.invocation({ args: { data } });
    return new Client()
      .setId(data.id)
      .setRevisionId(data.revision_id)
      .setMarketId(data.market_id)
      .setName(data.name)
      .setDescription(data.description)
      .setWebhookUrl(data.webhook_url)
      .setWebhookHeaders(data.webhook_headers)
      .setCreatedOn(data.created_on)
      .setUpdatedOn(data.updated_on);
  }
}

class ClientDB extends RevisionsKnexDAO {}

module.exports = {
  ClientDB,
  ClientTransformer
};
