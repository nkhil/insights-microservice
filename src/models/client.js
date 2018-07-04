const uuid = require('uuid/v4');

class Client {
  constructor() {
    this.id = uuid();
    this.revisionId = uuid();
    this.name = undefined;
    this.description = undefined;
    this.marketId = undefined;
    this.webhookUrl = undefined;
    this.webhookHeaders = {};
    this.createdOn = undefined;
    this.updatedOn = undefined;
  }

  setId(id) {
    this.id = id;
    return this;
  }

  setRevisionId(revisionId) {
    this.revisionId = revisionId;
    return this;
  }

  setName(name) {
    this.name = name;
    return this;
  }

  setDescription(description) {
    this.description = description;
    return this;
  }

  setMarketId(marketId) {
    this.marketId = marketId;
    return this;
  }

  setWebhookUrl(webhookUrl) {
    this.webhookUrl = webhookUrl;
    return this;
  }

  setWebhookHeaders(webhookHeaders) {
    this.webhookHeaders = webhookHeaders;
    return this;
  }

  setCreatedOn(createdOn) {
    this.createdOn = new Date(createdOn);
    return this;
  }

  setUpdatedOn(updatedOn) {
    this.updatedOn = new Date(updatedOn);
    return this;
  }

  newRevision() {
    this.revisionId = uuid();
    return this;
  }
}

module.exports = {
  Client
};
