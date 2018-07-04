const uuid = require('uuid/v4');
const logger = require('../logger');
const validator = require('validator');
const { Quote } = require('../models');
const { InvalidParametersError, MissingParametersError, ResourceNotFoundError } = require('../errors');
const { metrics } = require('../lib');

class QuotesController {
  constructor(database) {
    this.db = database;
  }

  static isValidId({ id }) {
    return typeof id === 'string' && validator.isUUID(id, 4);
  }

  async create({ rfqId, marketId, clientId, providerId, payload, lifespan, onBehalfOf }) {
    logger.invocation({
      args: { rfqId, marketId, clientId, providerId, payload, lifespan, onBehalfOf }
    });
    const model = new Quote()
      .setId(uuid())
      .setRevisionId(uuid())
      .setRfqId(rfqId)
      .setMarketId(marketId)
      .setClientId(clientId)
      .setProviderId(providerId)
      .setPayload(payload)
      .setLifespan(lifespan)
      .setOnBehalfOf(onBehalfOf);

    const { err, data } = await this.db.create({ model });
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    return { err: null, data };
  }

  async get({ id, onBehalfOf }) {
    logger.invocation({ args: { id, onBehalfOf } });
    let error;
    if (!id) {
      logger.error({ message: 'id is mandatory field' });
      metrics.increment('errors');
      error = new MissingParametersError();
    } else if (!QuotesController.isValidId({ id })) {
      logger.error({ message: 'id must be a uuid/v4' });
      metrics.increment('errors');
      error = new InvalidParametersError();
    }
    if (error) return { err: error, data: null };

    const { err, data } = await this.db.list({
      filters: { 'quotes.id': id, onBehalfOf }
    });
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    if (data.length === 0) {
      logger.error({ message: `quote: ${id} not found` });
      metrics.increment('errors');
      return { err: new ResourceNotFoundError(), data: null };
    }

    return { err: null, data: data[0] };
  }

  async list({
    id, clientId, providerId, onBehalfOf, marketId, rfqId, active, offset = 0, limit = 10 }) {
    logger.invocation({
      args: { id, clientId, providerId, onBehalfOf, rfqId, marketId, active, offset, limit }
    });
    let err;
    if ((id instanceof Array && !id.every(uid => QuotesController.isValidId({ id: uid })))
    || (typeof id === 'string' && !QuotesController.isValidId({ id }))) {
      logger.error({ message: 'all ids must be a valid uuid/v4' });
      metrics.increment('errors');
      err = new InvalidParametersError();
    }
    if (typeof clientId !== 'undefined' && !QuotesController.isValidId({ id: clientId })) {
      logger.error({ message: 'clientId must be valid uuid/v4' });
      metrics.increment('errors');
      err = new InvalidParametersError();
    }
    if (typeof providerId !== 'undefined' && !QuotesController.isValidId({ id: providerId })) {
      logger.error({ message: 'providerId must be valid uuid/v4' });
      metrics.increment('errors');
      err = new InvalidParametersError();
    }
    if (typeof rfqId !== 'undefined' && !QuotesController.isValidId({ id: rfqId })) {
      logger.error({ message: 'rfqId must be valid uuid/v4' });
      metrics.increment('errors');
      err = new InvalidParametersError();
    }
    if (typeof marketId !== 'undefined' && !QuotesController.isValidId({ id: marketId })) {
      logger.error({ message: 'marketId must be valid uuid/v4' });
      metrics.increment('errors');
      err = new InvalidParametersError();
    }
    if (err) return { err, data: null };

    let data;
    ({ err, data } = await this.db.list({
      filters: { id, clientId, providerId, onBehalfOf, rfqId, marketId }
    }));
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    // filters the quotes by active/inactive, if the query has been provided
    if (active === true) {
      data = data.filter(quote => (
        new Date(quote.createdOn.getTime() + parseInt(quote.lifespan, 10)) > new Date()
      ));
    }
    if (active === false) {
      data = data.filter(quote => (
        new Date(quote.createdOn.getTime() + parseInt(quote.lifespan, 10)) <= new Date()
      ));
    }
    return { err: null, data: data.splice(offset, limit) };
  }

  async update({ id, acceptance, completion, status }) {
    logger.invocation({ args: { id, acceptance, completion, status } });
    let error;
    if (!id) {
      logger.error({ message: 'id is a mandatory field' });
      metrics.increment('errors');
      error = new MissingParametersError();
    } else if (!QuotesController.isValidId({ id })) {
      logger.error({ message: 'id must be a uuid/v4' });
      metrics.increment('errors');
      error = new InvalidParametersError();
    }
    if (error) return { err: error, data: null };

    let { err, data: quote } = await this.db.get({ id });
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    quote
      .newRevision()
      .setCompletion(completion || quote.completion)
      .setAcceptance(acceptance || quote.acceptance)
      .setStatus(status || quote.status);

    ({ err, data: quote } = await this.db.update({ id, model: quote }));
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    return { err: null, data: quote };
  }
}

module.exports = { QuotesController };
