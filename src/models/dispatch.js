const rp = require('request-promise');
const config = require('../config');
const uuid = require('uuid/v4');

const REQUEST_TIMEOUT = config.dispatch.request_timeout;

class DispatchRequest {
  constructor({ requestLibrary = rp }) {
    this.id = uuid();
    this.batchId = null;
    this.requestLibrary = requestLibrary;
    this.request = null;
    this.isDead = false;
    this.isDelivered = false;
    this.error = {};
    this.deliveredAt = null;
    this.killedAt = null;
  }

  setId(id) {
    this.id = id;
    return this;
  }

  setBatchId(batchId) {
    this.batchId = batchId;
    return this;
  }

  setTargetId(targetId) {
    this.targetId = targetId;
    return this;
  }

  setRequest(request) {
    this.request = { ...request, timeout: REQUEST_TIMEOUT };
    return this;
  }

  setIsDead(isDead) {
    this.isDead = isDead;
    return this;
  }

  setIsDelivered(isDelivered) {
    this.isDelivered = isDelivered;
    return this;
  }

  setError(error) {
    this.error = error;
    return this;
  }

  setDeliveredAt(deliveredAt) {
    this.deliveredAt = deliveredAt;
    return this;
  }

  setKilledAt(killedAt) {
    this.killedAt = killedAt;
    return this;
  }
}

module.exports = {
  DispatchRequest
};
