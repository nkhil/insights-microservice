const Promise = require('bluebird');
const validator = require('validator');
const { DispatchRequest } = require('../models');
const logger = require('../logger');
const { InvalidParametersError } = require('../errors');
const { metrics } = require('../lib');

class DispatchController {
  constructor(database) {
    this.db = database;
  }

  static isValidId({ id }) {
    switch (true) {
      case (!(typeof id === 'string')):
      case (!(validator.isUUID(id, 4))):
        return false;
      default:
        return true;
    }
  }

  async getBatch({ batchId }) {
    logger.invocation({ args: { batchId } });
    if (!DispatchController.isValidId({ id: batchId })) {
      logger.error({ message: 'id must be a uuid/v4' });
      metrics.increment('errors');
      return { err: new InvalidParametersError(), data: null };
    }
    const { err, data } = await this.db.list({ filters: { batchId } });
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    return { err: null, data };
  }

  async retryForTarget({ targetId }) {
    logger.invocation({ args: { targetId } });
    const { err, data } = await this.db.list({ filters: { targetId, isDead: true } });
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    data.map(request => this.sendRequest(request));
    return { err: null, data };
  }

  async sendBatch({ batchId, requests, onFail }) {
    logger.invocation({ args: { batchId, requests } });
    const dispatchRequests = requests.map((request) => {
      const targetId = Object.keys(request)[0];
      return new DispatchRequest({})
        .setRequest(request[targetId])
        .setBatchId(batchId)
        .setTargetId(targetId)
        .setIsDelivered(true)
        .setIsDead(false)
        .setError({})
        .setDeliveredAt(new Date())
        .setKilledAt(null);
    });
    try {
      await Promise.map(dispatchRequests, async (request) => {
        const { err } = await this.db.create({ model: request });
        if (err) {
          logger.debug({ message: 'error from db' });
          throw err;
        }
      });
      const timer = logger.startTimer();
      // its important not to wait here. We want requests to occur in background.
      const batch = dispatchRequests.map(request =>
        this.sendRequest(request, onFail).catch(e => e));
      Promise.all(batch).then(() => timer.stop().info({ message: 'Successful Batch Send' }));
      return { err: null, data: dispatchRequests };
    } catch (err) {
      logger.debug({ message: 'error in a request save' });
      return { err, data: null };
    }
  }

  async sendRequest(dispatchRequest, onFail) {
    logger.invocation({ args: { dispatchRequest } });
    const { request, requestLibrary } = dispatchRequest;
    const timer = logger.startTimer();
    try {
      await requestLibrary(request);
      timer.stop().info({ message: 'Successful Message Send' });
    } catch (error) {
      timer.stop().info({ message: 'Error Sending Message' });
      dispatchRequest
        .setIsDead(true)
        .setIsDelivered(false)
        .setError(error)
        .setDeliveredAt(null)
        .setKilledAt(new Date());
      if (dispatchRequest.error.options.body.event !== 'DELIVERY FAIL') {
        await onFail(dispatchRequest);
      }
      const { err } = await this.db.update({ id: dispatchRequest.id, keyValues: dispatchRequest });
      if (err) {
        logger.debug({ message: 'error updating db' });
      }
    }
  }
}

module.exports = { DispatchController };
