const uuid = require('uuid/v4');
const logger = require('../logger');
const validator = require('validator');
const { Provider } = require('../models');
const { InvalidParametersError, MissingParametersError } = require('../errors');
const { distance, metrics } = require('../lib');

class ProvidersController {
  constructor(database) {
    this.db = database;
  }

  static isValidId({ id }) {
    return typeof id === 'string' && validator.isUUID(id, 4);
  }

  static isValidLocation(lat, long, radius) {
    switch (true) {
      case (isNaN(radius)):
      case (isNaN(lat)):
      case (isNaN(long)):
      case (radius < 0):
      case (lat < -90):
      case (lat > 90):
      case (long < -180):
      case (long > 180):
        throw new Error();
      default:
        return true;
    }
  }

  static filterByLocation(data, lat, long, radius) {
    logger.invocation({ args: { data, lat, long, radius } });
    try {
      this.isValidLocation(lat, long, radius);
      const parsedRadius = parseInt(radius, 10);
      if (isNaN(parsedRadius)) {
        throw new TypeError();
      }
      const result = data.filter(provider => provider.locations
        .filter(location => distance(
          location,
          { lat, long }
        ) <= parsedRadius).length > 0);
      return { err: null, data: result };
    } catch (e) {
      logger.error({ message: 'error filtering locations' });
      metrics.increment('errors');
      return { err: new InvalidParametersError(), data: null };
    }
  }

  async create({ name, marketId }) {
    logger.invocation({ args: { name, marketId } });
    const provider = new Provider()
      .setId(uuid())
      .setName(name)
      .setMarketId(marketId);
    const { err, data } = await this.db.create({ model: provider });
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
    } else if (!ProvidersController.isValidId({ id })) {
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

  async list({ ids, offset = 0, limit = 10, marketId, providerId, location }) {
    logger.invocation({ args: { ids, marketId, location, offset, limit } });
    let err;
    if (ids && ids.length === 0) {
      logger.error({ message: 'provider ids is empty' });
      metrics.increment('errors');
      err = new MissingParametersError();
    }
    if (ids && !ids.every(uid => ProvidersController.isValidId({ id: uid }))) {
      logger.error({ message: 'all provider ids must be a valid uuid/v4' });
      metrics.increment('errors');
      err = new InvalidParametersError();
    }
    if (marketId && !ProvidersController.isValidId({ id: marketId })) {
      logger.error({ message: 'market id must be a valid uuid/v4' });
      metrics.increment('errors');
      err = new InvalidParametersError();
    }
    if (err) return { err, data: null };

    let data;
    ({ err, data } = await this.db.list({ filters: { id: ids, marketId, providerId } }));
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    // if location is provided with values from router
    if (location && !Object.values(location).includes(undefined)) {
      ({ err, data } = ProvidersController.filterByLocation(
        data,
        location.lat,
        location.long,
        location.radius
      ));
    }
    if (err) {
      logger.debug({ message: 'error from filter' });
      return { err, data: null };
    }
    return { err: null, data: data.splice(offset, limit) };
  }

  /* eslint-disable max-len */
  async update({ id, description, webhookUrl, webhookHeaders, filterSchema, imageUrl, locations }) {
    logger.invocation({ args: { id, description, webhookUrl, webhookHeaders, filterSchema, imageUrl, locations } });
    /* eslint-enable max-len */
    let error;
    if (!id) {
      logger.error({ message: 'id is a mandatory field' });
      metrics.increment('errors');
      error = new MissingParametersError();
    } else if (!ProvidersController.isValidId({ id })) {
      logger.error({ message: 'id must be a uuid/v4' });
      metrics.increment('errors');
      error = new InvalidParametersError();
    }
    if (error) return { err: error, data: null };

    let { err, data: provider } = await this.db.get({ id });
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    provider
      .newRevision()
      .setDescription(description || provider.description)
      .setWebhookURL(webhookUrl || provider.webhookUrl)
      .setWebhookHeaders(webhookHeaders || provider.webhookHeaders)
      .setFilterSchema(filterSchema || provider.filterSchema)
      .setImageUrl(imageUrl || provider.imageUrl)
      .setLocations(locations || provider.locations);

    ({ err, data: provider } = await this.db.update({ id, model: provider }));
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    return { err: null, data: provider };
  }

  async delete({ id }) {
    logger.invocation({ args: { id } });
    let error;
    if (!id) {
      logger.error({ message: 'id is a mandatory field' });
      metrics.increment('errors');
      error = new MissingParametersError();
    } else if (!ProvidersController.isValidId({ id })) {
      logger.error({ message: 'id must be a uuid/v4' });
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
    } else if (!ProvidersController.isValidId({ id })) {
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
    if (!id && !revisionId) {
      logger.error({ message: 'id/revisionId is mandatory field' });
      metrics.increment('errors');
      error = new MissingParametersError();
    } else if (!ProvidersController.isValidId({ id })) {
      logger.error({ message: 'id must be a valid uuid/v4' });
      metrics.increment('errors');
      error = new InvalidParametersError();
    } else if (!ProvidersController.isValidId({ id: revisionId })) {
      logger.error({ message: 'revisionId must be a valid uuid/v4' });
      metrics.increment('errors');
      error = new InvalidParametersError();
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
  ProvidersController
};

