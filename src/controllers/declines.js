const uuid = require('uuid/v4');
const logger = require('../logger');
const validator = require('validator');
const { Decline } = require('../models');
const { InvalidParametersError, MissingParametersError } = require('../errors');
const { metrics } = require('../lib');

class DeclinesController {
  constructor(database) {
    this.db = database;
  }

  static isValidId({ id }) {
    return typeof id === 'string' && validator.isUUID(id, 4);
  }

  async create({ rfqId, marketId, clientId, providerId, reasons }) {
    logger.invocation({ args: { rfqId, marketId, clientId, providerId, reasons } });
    const model = new Decline()
      .setId(uuid())
      .setRfqId(rfqId)
      .setMarketId(marketId)
      .setClientId(clientId)
      .setProviderId(providerId)
      .setReasons(reasons);

    const { err, data } = await this.db.create({ model });
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    return { err: null, data };
  }

  async get({ id }) {
    logger.invocation({ args: { id } });
    let error;
    if (!id) {
      logger.error({ message: 'id is mandatory field' });
      metrics.increment('errors');
      error = new MissingParametersError();
    } else if (!DeclinesController.isValidId({ id })) {
      logger.error({ message: 'id must be a uuid/v4' });
      metrics.increment('errors');
      error = new InvalidParametersError();
    }
    if (error) return { err: error, data: null };

    const { err, data } = await this.db.get({ id });
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    return { err: null, data };
  }

  async list({ clientId, providerId, marketId, rfqId, offset = 0, limit = 10 }) {
    logger.invocation({ args: { clientId, providerId, rfqId, offset, limit } });
    let err;
    let data = null;
    if (typeof clientId !== 'undefined' && !DeclinesController.isValidId({ id: clientId })) {
      logger.error({ message: 'clientId must be valid uuid/v4' });
      err = new InvalidParametersError();
    }
    if (typeof providerId !== 'undefined' && !DeclinesController.isValidId({ id: providerId })) {
      logger.error({ message: 'providerId must be valid uuid/v4' });
      err = new InvalidParametersError();
    }
    if (typeof rfqId !== 'undefined' && !DeclinesController.isValidId({ id: rfqId })) {
      logger.error({ message: 'rfqId must be valid uuid/v4' });
      err = new InvalidParametersError();
    }
    if (typeof marketId !== 'undefined' && !DeclinesController.isValidId({ id: marketId })) {
      logger.error({ message: 'marketId must be valid uuid/v4' });
      err = new InvalidParametersError();
    }
    if (err) return { err, data: null };
    ({ err, data } = await this.db.list({
      offset,
      limit,
      filters: { clientId, providerId, marketId, rfqId }
    }));
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    return { err: null, data };
  }
}

module.exports = { DeclinesController };
