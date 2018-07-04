const uuid = require('uuid');
const validator = require('validator');
const { Market } = require('../models');
const logger = require('../logger');
const { Schema } = require('../schema');
const { InvalidParametersError, MissingParametersError } = require('../errors');
const { metrics } = require('../lib');

class MarketsController {
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

  async create({ name }) {
    logger.invocation({ args: { name } });
    if (!name) {
      logger.error({ message: 'name is mandatory field' });
      metrics.increment('errors');
      return { err: new MissingParametersError(), data: null };
    }
    const market = new Market()
      .setId(uuid())
      .setName(name);

    const { err, data } = await this.db.create({ model: market });
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    return { err: null, data };
  }

  async list({ offset = 0, limit = 10, marketId }) {
    logger.invocation({ args: { marketId, offset, limit } });
    let err;
    let data = null;
    if (marketId && !MarketsController.isValidId({ id: marketId })) {
      logger.error({ message: 'market id must be a valid uuid/v4' });
      metrics.increment('errors');
      err = new InvalidParametersError();
    }
    if (err) return { err, data: null };
    ({ err, data } = await this.db.list({
      offset,
      limit,
      filters: { marketId }
    }));
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
    } else if (!MarketsController.isValidId({ id })) {
      logger.error({ message: 'id must be a valid uuid/v4' });
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
  /* eslint-disable max-len */
  async update({ id, description, imageUrl, isActive, lit, rfqDefaultLifespan, rfqCloseOnAccept, rfqSchema, quoteSchema, acceptanceSchema, completionSchema }) {
    logger.invocation({
      args: { id, description, imageUrl, isActive, lit, rfqDefaultLifespan, rfqCloseOnAccept, rfqSchema, quoteSchema, acceptanceSchema, completionSchema }
    });
    /* eslint-enable max-len */
    let error;
    if (!id) {
      logger.error({ message: 'id is a mandatory field' });
      metrics.increment('errors');
      error = new MissingParametersError();
    } else if (!MarketsController.isValidId({ id })) {
      logger.error({ message: 'id must be a uuid/v4' });
      metrics.increment('errors');
      error = new InvalidParametersError();
    }
    if (error) return { err: error, data: null };

    let { err, data: market } = await this.db.get({ id });
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    market
      .newRevision()
      .setDescription(description || market.description)
      .setImageUrl(imageUrl || market.imageUrl)
      .setIsActive(typeof isActive !== 'undefined' ? isActive : market.isActive)
      .setLit(typeof lit !== 'undefined' ? lit : market.lit)
      .setRfqDefaultLifespan(rfqDefaultLifespan || market.rfqDefaultLifespan)
      .setRfqCloseOnAccept(typeof rfqCloseOnAccept !== 'undefined' ? rfqCloseOnAccept : market.rfqCloseOnAccept)
      .setRfqSchema(rfqSchema || market.rfqSchema)
      .setQuoteSchema(quoteSchema || market.quoteSchema)
      .setAcceptanceSchema(acceptanceSchema || market.acceptanceSchema)
      .setCompletionSchema(completionSchema || market.completionSchema);

    ({ err } = Schema.isValidSchema({ schema: market.rfqSchema }));
    if (err) {
      logger.debug({ message: 'Error from the Schema class' });
      return { err, data: null };
    }
    ({ err } = Schema.isValidSchema({ schema: market.quoteSchema }));
    if (err) {
      logger.debug({ message: 'Error from the Schema class' });
      return { err, data: null };
    }
    ({ err } = Schema.isValidSchema({ schema: market.acceptanceSchema }));
    if (err) {
      logger.debug({ message: 'Error from the Schema class' });
      return { err, data: null };
    }
    ({ err } = Schema.isValidSchema({ schema: market.completionSchema }));
    if (err) {
      logger.debug({ message: 'Error from the Schema class' });
      return { err, data: null };
    }

    ({ err, data: market } = await this.db.update({ id, model: market }));
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    return { err: null, data: market };
  }

  async delete({ id }) {
    logger.invocation({ args: { id } });
    let error;
    if (!id) {
      logger.error({ message: 'id is mandatory field' });
      metrics.increment('errors');
      error = new MissingParametersError();
    } else if (!MarketsController.isValidId({ id })) {
      logger.error({ message: 'id must be a valid uuid/v4' });
      metrics.increment('errors');
      error = new InvalidParametersError();
    }
    if (error) return { err: error, data: null };

    const { err, data } = await this.db.delete({ id });
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    return { err: null, data };
  }

  async listRevisions({ id, offset = 0, limit = 10 }) {
    logger.invocation({ args: { id, offset, limit } });
    let error;
    if (!id) {
      logger.error({ message: 'id is mandatory field' });
      metrics.increment('errors');
      error = new MissingParametersError();
    } else if (!MarketsController.isValidId({ id })) {
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
      case (!id):
      case (!revisionId):
        logger.error({ message: 'id/revisionId is mandatory field' });
        metrics.increment('errors');
        error = new MissingParametersError();
        break;
      case (!MarketsController.isValidId({ id })):
      case (!MarketsController.isValidId({ id: revisionId })):
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
  MarketsController
};
