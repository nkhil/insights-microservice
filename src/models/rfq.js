class Rfq {
  constructor() {
    this.id = undefined;
    this.payload = {};
    this.requestGroup = [];
    this.clientId = undefined;
    this.marketId = undefined;
    this.lifespan = undefined;
    this.createdOn = undefined;
    this.onBehalfOf = undefined;
  }

  setId(id) {
    this.id = id;
    return this;
  }

  setPayload(payload) {
    this.payload = payload;
    return this;
  }

  setRequestGroup(requestGroup) {
    this.requestGroup = requestGroup;
    return this;
  }

  setClientId(clientId) {
    this.clientId = clientId;
    return this;
  }

  setMarketId(marketId) {
    this.marketId = marketId;
    return this;
  }

  setOnBehalfOf(onBehalfOf) {
    this.onBehalfOf = onBehalfOf;
    return this;
  }

  setLifespan(lifespan) {
    this.lifespan = lifespan;
    return this;
  }

  setCreatedOn(dateString) {
    this.createdOn = new Date(dateString);
    return this;
  }
}

module.exports = {
  Rfq
};
