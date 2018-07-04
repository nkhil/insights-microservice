const EventEmitter = require('events');

const logger = require('../logger');
const { DefaultKnexDAO } = require('./default');
const { DispatchRequest } = require('../models');
const { metrics } = require('../lib');

class DispatchTransformer extends EventEmitter {
  static fromDatabase(model) {
    logger.invocation({ args: { model } });
    return new DispatchRequest({})
      .setId(model.id)
      .setBatchId(model.batch_id)
      .setTargetId(model.target_id)
      .setRequest(model.request)
      .setIsDead(model.is_dead)
      .setIsDelivered(model.is_delivered)
      .setError(model.error)
      .setDeliveredAt(model.delivered_at ? new Date(model.delivered_at) : null)
      .setKilledAt(model.killed_at ? new Date(model.killed_at) : null);
  }

  static toDatabase(dispatchRequest) {
    logger.invocation({ args: { dispatchRequest } });
    if (!(dispatchRequest instanceof DispatchRequest)) {
      logger.error({ message: 'dispatchRequest should be instance of DispatchRequest' });
      metrics.increment('errors');
      throw new TypeError();
    }
    return {
      id: dispatchRequest.id,
      batch_id: dispatchRequest.batchId,
      target_id: dispatchRequest.targetId,
      request: JSON.stringify(dispatchRequest.request),
      is_dead: dispatchRequest.isDead,
      is_delivered: dispatchRequest.isDelivered,
      error: JSON.stringify(dispatchRequest.error),
      delivered_at: dispatchRequest.deliveredAt ? dispatchRequest.deliveredAt.toISOString() : null,
      killed_at: dispatchRequest.killedAt ? dispatchRequest.killedAt.toISOString() : null
    };
  }
}

class DispatchDB extends DefaultKnexDAO {}

module.exports = {
  DispatchDB,
  DispatchTransformer
};
