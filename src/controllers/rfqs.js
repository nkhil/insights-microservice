const uuid = require('uuid/v4');
const validator = require('validator');
const { Rfq } = require('../models');
const logger = require('../logger');
const {
  InvalidParametersError,
  MissingParametersError,
  ResourceNotFoundError
} = require('../errors');
const { metrics } = require('../lib');

class RfqsController {
  constructor(database) {
    this.db = database;
  }

  static isValidId({ id }) {
    return typeof id === 'string' && validator.isUUID(id, 4);
  }

  async create({ payload, requestGroup, clientId, marketId, lifespan, onBehalfOf }) {
    logger.invocation({ args:
      { payload, requestGroup, clientId, marketId, lifespan, onBehalfOf }
    });
    const rfq = new Rfq()
      .setId(uuid())
      .setPayload(payload)
      .setRequestGroup(requestGroup)
      .setClientId(clientId)
      .setMarketId(marketId)
      .setLifespan(lifespan)
      .setOnBehalfOf(onBehalfOf);
    const { err, data } = await this.db.create({ model: rfq });
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
    } else if (!RfqsController.isValidId({ id })) {
      logger.error({ message: 'id must be a uuid/v4' });
      metrics.increment('errors');
      error = new InvalidParametersError();
    }
    if (error) return { err: error, data: null };

    const { err, data: rfq } = await this.db.get({ id });
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    // checks the onBehalfOf matches the rfq, if provided
    if (onBehalfOf && onBehalfOf !== rfq.onBehalfOf) {
      logger.error({ message: `rfq: ${id} not found` });
      metrics.increment('errors');
      return { err: new ResourceNotFoundError(), data: null };
    }
    return { err: null, data: rfq };
  }

  async list({ id, clientId, marketId, providerId, onBehalfOf, active, offset = 0, limit = 10 }) {
    logger.invocation({
      args: { id, clientId, marketId, providerId, onBehalfOf, active, offset, limit }
    });
    let err;
    // check all ids are valid, for both array and string
    if ((id instanceof Array && !id.every(uid => RfqsController.isValidId({ id: uid })))
    || (typeof id === 'string' && !RfqsController.isValidId({ id }))) {
      logger.error({ message: 'all ids must be a valid uuid/v4' });
      metrics.increment('errors');
      err = new InvalidParametersError();
    }
    if (typeof clientId !== 'undefined' && !RfqsController.isValidId({ id: clientId })) {
      logger.error({ message: 'clientId must be valid uuid/v4' });
      metrics.increment('errors');
      err = new InvalidParametersError();
    }
    if (typeof marketId !== 'undefined' && !RfqsController.isValidId({ id: marketId })) {
      logger.error({ message: 'marketId must be valid uuid/v4' });
      metrics.increment('errors');
      err = new InvalidParametersError();
    }
    if (err) return { err, data: null };
    let data;
    ({ err, data } = await this.db.list({ filters: { id, clientId, marketId, onBehalfOf } }));
    if (err) {
      logger.debug({ message: 'error from db' });
      return { err, data: null };
    }
    // filters the rfqs by active/inactive, if the query has been provided
    if (active === true) {
      data = data.filter(rfq => (
        new Date(rfq.createdOn.getTime() + parseInt(rfq.lifespan, 10)) > new Date()
      ));
    }
    if (active === false) {
      data = data.filter(rfq => (
        new Date(rfq.createdOn.getTime() + parseInt(rfq.lifespan, 10)) <= new Date()
      ));
    }
    if (providerId) {
      data = data.filter(rfq => rfq.requestGroup.includes(providerId));
    }
    return { err: null, data: data.splice(offset, limit) };
  }
}


module.exports = {
  RfqsController
};
