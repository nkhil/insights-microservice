class Decline {
  constructor() {
    this.id = undefined;
    this.rfqId = undefined;
    this.marketId = undefined;
    this.clientId = undefined;
    this.providerId = undefined;
    this.reasons = [];
    this.createdOn = undefined;
  }

  setId(id) {
    this.id = id;
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

  setReasons(reasons) {
    this.reasons = reasons;
    return this;
  }

  setCreatedOn(createdOn) {
    this.createdOn = new Date(createdOn);
    return this;
  }
}

module.exports = { Decline };
