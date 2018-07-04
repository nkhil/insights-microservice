const uuid = require('uuid/v4');

class Provider {
  constructor() {
    this.id = uuid();
    this.revisionId = uuid();
    this.name = undefined;
    this.description = undefined;
    this.marketId = undefined;
    this.webhookUrl = undefined;
    this.webhookHeaders = {};
    this.filterSchema = {};
    this.imageUrl = undefined;
    this.locations = [];
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

  setWebhookURL(webhookUrl) {
    this.webhookUrl = webhookUrl;
    return this;
  }

  setWebhookHeaders(webhookHeaders) {
    this.webhookHeaders = webhookHeaders;
    return this;
  }

  setFilterSchema(filterSchema) {
    this.filterSchema = filterSchema;
    return this;
  }

  setImageUrl(imageUrl) {
    this.imageUrl = imageUrl;
    return this;
  }

  setLocations(locations) {
    this.locations = locations;
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
  Provider
};
