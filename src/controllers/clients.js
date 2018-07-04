const uuid = require('uuid/v4');
const validator = require('validator');
const { Client } = require('../models');
const logger = require('../logger');
const { InvalidParametersError, MissingParametersError } = require('../errors');
const { metrics } = require('../lib');

class ClientsController {
  constructor(database) {
    this.db = database;
  }

  static isValidId({ id }) {
    return typeof id === 'string' && validator.isUUID(id, 4);
  }

  async create({ name, marketId }) {
    logger.invocation({ args: { name, marketId } });
    const client = new Client()
      .setId(uuid())
      .setName(name)
      .setMarketId(marketId);
    const { err, data } = await this.db.create({ model: client });
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
      logger.error({ message: 'id is a mandatory field' });
      metrics.increment('errors');
      error = new MissingParametersError();
    } else if (!ClientsController.isValidId({ id })) {
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

  async list({ offset = 0, limit = 10, marketId, clientId }) {
    logger.invocation({ args: { marketId, offset, limit } });
    let error;
    if (marketId && !ClientsController.isValidId({ id: marketId })) {
      logger.error({ message: 'market id must be a valid uuid/v4' });
      metrics.increment('errors');
      error = new InvalidParametersError();
    }
    if (error) return { err: error, data: null };

    const { err, data } = await this.db.list({
      offset,
      limit,
      filters: { marketId, clientId }
    });
    if (err) {
      logger.debug({ message: 'error from list' });
      return { err, data: null };
    }
    return { err: null, data };
  }

  async update({ id, description, webhookUrl, webhookHeaders }) {
    logger.invocation({ args: { id, description, webhookUrl, webhookHeaders } });
    let error;
    if (!id) {
      logger.error({ message: 'id is a mandatory field' });
      metrics.increment('errors');
      error = new MissingParametersError();
    } else if (!ClientsController.isValidId({ id })) {
      logger.error({ message: 'id must be a uuid/v4' });
      metrics.increment('errors');
      error = new InvalidParametersError();
    }
    if (error) return { err: error, data: null };

    let { err, data: client } = await this.db.get({ id });
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    client
      .newRevision()
      .setDescription(description || client.description)
      .setWebhookUrl(webhookUrl || client.webhookUrl)
      .setWebhookHeaders(webhookHeaders || client.webhookHeaders);

    ({ err, data: client } = await this.db.update({ id, model: client }));
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    return { err: null, data: client };
  }

  async delete({ id }) {
    logger.invocation({ args: { id } });
    let err;
    if (!id) {
      logger.error({ message: 'id is a mandatory field' });
      metrics.increment('errors');
      err = new MissingParametersError();
    } else if (!ClientsController.isValidId({ id })) {
      logger.error({ message: 'id must be a uuid/v4' });
      metrics.increment('errors');
      err = new InvalidParametersError();
    }
    if (err) return { err, data: null };

    ({ err } = await this.db.delete({ id }));
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    return { err: null, data: null };
  }

  async listRevisions({ id, offset = 0, limit = 10 }) {
    logger.invocation({ args: { id, offset, limit } });
    let error;
    if (!id) {
      logger.error({ message: 'id is mandatory field' });
      metrics.increment('errors');
      error = new MissingParametersError();
    } else if (!ClientsController.isValidId({ id })) {
      logger.error({ message: 'id must be a valid uuid/v4' });
      metrics.increment('errors');
      error = new InvalidParametersError();
    }
    if (error) return { err: error, data: null };

    const { err, data } = await this.db.listRevisions({ id, offset, limit });
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    return { err: null, data };
  }

  async getRevision({ id, revisionId }) {
    logger.invocation({ args: { id, revisionId } });
    let error;
    switch (true) {
      case (!id && !revisionId):
        logger.error({ message: 'id/revisionId is mandatory field' });
        metrics.increment('errors');
        error = new MissingParametersError();
        break;
      case (!ClientsController.isValidId({ id })):
      case (!ClientsController.isValidId({ id: revisionId })):
        logger.error({ message: 'id/revisionId must be a valid uuid/v4' });
        metrics.increment('errors');
        error = new InvalidParametersError();
        break;
      default:
        error = null;
    }
    if (error) return { err: error, data: null };

    const { err, data } = await this.db.getRevision({ id, revisionId });
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    return { err: null, data };
  }
}


module.exports = {
  ClientsController
};
