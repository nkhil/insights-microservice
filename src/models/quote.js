const uuid = require('uuid');

class Quote {
  constructor() {
    this.id = undefined;
    this.revisionId = undefined;
    this.rfqId = undefined;
    this.marketId = undefined;
    this.clientId = undefined;
    this.providerId = undefined;
    this.payload = {};
    this.lifespan = undefined;
    this.status = 'pending';
    this.acceptance = {};
    this.completion = {};
    this.createdOn = undefined;
    this.updatedOn = undefined;
  }

  setId(id) {
    this.id = id;
    return this;
  }

  setRevisionId(id) {
    this.revisionId = id;
    return this;
  }

  newRevision() {
    this.revisionId = uuid();
    return this;
  }

  setRfqId(id) {
    this.rfqId = id;
    return this;
  }

  setMarketId(id) {
    this.marketId = id;
    return this;
  }

  setClientId(id) {
    this.clientId = id;
    return this;
  }

  setProviderId(id) {
    this.providerId = id;
    return this;
  }

  setPayload(object) {
    this.payload = object;
    return this;
  }

  setLifespan(lifespan) {
    this.lifespan = lifespan;
    return this;
  }

  setStatus(string) {
    this.status = string;
    return this;
  }

  setAcceptance(object) {
    this.acceptance = object;
    return this;
  }

  setCompletion(object) {
    this.completion = object;
    return this;
  }

  setOnBehalfOf(onBehalfOf) {
    this.onBehalfOf = onBehalfOf;
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
}

module.exports = { Quote };
