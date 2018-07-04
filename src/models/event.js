const config = require('../config');

class Event {
  constructor() {
    this.type = null;
    this.event = null;
    this.data = null;
    this.marketId = null;
    this.environment = config.environment;
  }
  setType(data) {
    this.type = data;
    return this;
  }

  setEvent(data) {
    this.event = data;
    return this;
  }

  setData(data) {
    this.data = data;
    return this;
  }

  setMarketId(id) {
    this.marketId = id;
    return this;
  }
}

module.exports = {
  Event
};
