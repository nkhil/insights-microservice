const express = require('express');
const logger = require('../logger');
const middlewares = require('../middlewares');
const { roles } = require('../config');
const { ValidationError, SchemaNotFoundError, Schema } = require('../schema');
const {
  quotesController,
  rfqsController,
  clientsController,
  dispatchController,
  marketsController,
  providersController
} = require('../controllers');
const {
  MissingParametersError,
  RESTError,
  InvalidParametersError,
  ResourceNotFoundError
} = require('../errors');
const { Event } = require('../models');
const { analyticsStream, metrics } = require('../lib');

const router = express.Router();

router.post('/',
  middlewares.checkAccess({ accessRoles: [roles.provider] }),
  middlewares.schemaCheck('quotes_post'),
  async (req, res, next) => {
    // get the rfq
    const { err, data } = await rfqsController.get({ id: req.body.rfqId });
    if (err) {
      logger.debug({ message: 'error from rfq controller' });
      let e = err;
      if (err instanceof MissingParametersError) {
        e = new RESTError({
          message: 'Bad Request',
          description: 'RfqId must be provided',
          status: 400
        });
      }
      if (err instanceof InvalidParametersError) {
        e = new RESTError({
          message: 'Bad Request',
          description: 'rfqId must be a uuid/v4',
          status: 400
        });
      }
      if (err instanceof ResourceNotFoundError) {
        e = new RESTError({
          message: 'Resource Not Found',
          description: `Rfq with id: ${req.body.rfqId} not found`,
          status: 404
        });
      }
      return next(e);
    }
    // check provider is in rfq request group
    if (!data.requestGroup.includes(req.auth.userId)) {
      logger.error({ message: `providerId: ${req.auth.userId} not included in rfq request group` });
      metrics.increment('errors');
      return next(new RESTError({
        message: 'Forbidden',
        description: 'The provider is not within the users request group',
        status: 403
      }));
    }
    // check rfq is still active
    const expiry = new Date(data.createdOn.getTime() + parseInt(data.lifespan, 10));
    if (new Date() > expiry) {
      logger.error({ message: 'rfq has expired' });
      metrics.increment('errors');
      return next(new RESTError({
        message: 'Gone',
        description: 'the requested RFQ has expired',
        status: 410
      }));
    }
    req.rfq = data;
    return next();
  },
  async (req, res, next) => {
    const { err, data } = await marketsController.get({ id: req.rfq.marketId });
    if (err) {
      let e = err;
      logger.debug({ message: 'error from markets controller' });
      if (err instanceof MissingParametersError) {
        e = new RESTError({
          message: 'Bad Request',
          description: 'marketId must be provided',
          status: 400
        });
      }
      if (err instanceof InvalidParametersError) {
        e = new RESTError({
          message: 'Bad Request',
          description: 'marketId must be a uuid/v4',
          status: 400
        });
      }
      if (err instanceof ResourceNotFoundError) {
        e = new RESTError({
          message: 'Resource Not Found',
          description: `Market with id: ${req.rfq.marketId} not found`,
          status: 404
        });
      }
      return next(e);
    }
    if (data.isActive !== true) {
      logger.error({ message: 'market is inactive' });
      metrics.increment('errors');
      const error = new RESTError({
        message: 'Resource Not Found',
        description: 'Market is inactive',
        status: 404
      });
      return next(error);
    }
    req.market = data;
    return next();
  },
  async (req, res, next) => {
    // check market.quoteSchema matches the payload
    const { err } = await Schema.compareAndValidate(
      req.market.quoteSchema,
      req.body.payload
    );
    if (err) {
      logger.debug({ message: 'quote payload does not match market quoteSchema' });
      let e = err;
      if (e instanceof ValidationError) {
        e = new RESTError({
          message: 'Bad Request',
          description: 'Quote did not match the markets quote schema',
          status: 400
        });
      }
      return next(e);
    }
    return next();
  },
  async (req, res, next) => {
    const { err, data } = await clientsController.get({ id: req.rfq.clientId });
    if (err) {
      logger.debug({ message: 'error from clients controller' });
      let e = err;
      if (err instanceof MissingParametersError) {
        e = new RESTError({
          message: 'Bad Request',
          description: 'clientId must be provided',
          status: 400
        });
      }
      if (err instanceof InvalidParametersError) {
        e = new RESTError({
          message: 'Bad Request',
          description: 'clientId must be a uuid/v4',
          status: 400
        });
      }
      if (err instanceof ResourceNotFoundError) {
        e = new RESTError({
          message: 'Resource Not Found',
          description: `Client with id: ${req.rfq.clientId} not found`,
          status: 404
        });
      }
      return next(e);
    }
    req.client = data;
    return next();
  },
  async (req, res, next) => {
    const { err, data } = await quotesController.create({
      rfqId: req.rfq.id,
      marketId: req.market.id,
      clientId: req.client.id,
      providerId: req.auth.userId,
      payload: req.body.payload,
      lifespan: req.body.lifespan,
      onBehalfOf: req.rfq.onBehalfOf
    });
    if (err) {
      logger.debug({ message: 'error from quotes controller ' });
      return next(err);
    }
    req.quote = data;
    return next();
  },
  async (req, res, next) => {
    const event = new Event()
      .setType('QUOTE')
      .setEvent('CREATE')
      .setMarketId(req.market.id)
      .setData(req.quote);

    const requests = [{
      [req.client.id]: {
        uri: req.client.webhookUrl,
        headers: req.client.webhookHeaders,
        method: 'POST',
        body: event,
        json: true
      }
    }];

    const { data } = await providersController.get({ id: req.auth.userId });
    req.provider = data;

    const onFail = async (failedRequest) => {
      req.quote.clientId = failedRequest.targetId;
      const failedEvent = new Event()
        .setType('QUOTE')
        .setEvent('DELIVERY FAIL')
        .setMarketId(req.market.id)
        .setData(req.quote);

      const failedRequests = [{
        [req.auth.userId]: {
          uri: req.provider.webhookUrl,
          headers: req.provider.webhookHeaders,
          method: 'POST',
          body: failedEvent,
          json: true
        }
      }];
      await dispatchController.sendBatch({ batchId: req.quote.id, requests: failedRequests });
      metrics.increment('quote_create_delivery_fail');
    };

    await dispatchController.sendBatch({ batchId: req.quote.id, requests, onFail });
    metrics.increment('quote_create');
    logger.info({ message: 'RFQ:QUOTE SEGTIME', duration: (Date.now() - req.rfq.createdOn), provider: req.auth.userId });
    res.status(201).location(`/quotes/${req.quote.id}`).json(req.quote);
    analyticsStream.writeEvent({ event });
    return next();
  }
);

router.get('/:id',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin,
    roles.providerAdmin, roles.provider, roles.clientAdmin, roles.client] }),
  async (req, res, next) => {
    let err;
    let data = null;
    ({ err, data } = await quotesController.get({
      id: req.params.id,
      onBehalfOf: req.get('On-Behalf-Of')
    }));
    if (err) {
      logger.debug({ message: 'error from quotes controller' });
      if (err instanceof InvalidParametersError) {
        err = new RESTError({
          message: 'Bad Request',
          description: 'ID must be a uuid/v4',
          status: 400
        });
      }
      if (err instanceof ResourceNotFoundError) {
        err = new RESTError({
          message: 'Resource Not Found',
          description: `Quote with id: ${req.params.id} not found`,
          status: 404
        });
      }
      return next(err);
    }
    req.quote = data;
    return next();
  },
  async (req, res, next) => {
    // trying to access a quote that is not your own
    if ((req.quote.providerId !== req.auth.userId && req.auth.userType === roles.provider) ||
      (req.quote.clientId !== req.auth.userId && req.auth.userType === roles.client)) {
      logger.error({ message: `userId: ${req.auth.userType} denied access` });
      metrics.increment('errors');
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource.',
        status: 403
      }));
    }
    // trying to access a quote outside your market
    if ((req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) &&
        req.quote.marketId !== req.auth.marketId) {
      logger.error({ message: `User marketId: ${req.auth.marketId} denied access` });
      metrics.increment('errors');
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource.',
        status: 403
      }));
    }
    res.status(200).json(req.quote);
    return next();
  }
);

router.get('/',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin,
    roles.providerAdmin, roles.provider, roles.clientAdmin, roles.client] }),
  middlewares.setOffsetLimit(),
  async (req, res, next) => {
    if (req.query.active) {
      switch (req.query.active) {
        case ('true'):
          req.query.active = true;
          break;
        case ('false'):
          req.query.active = false;
          break;
        default:
          return next(new RESTError({
            message: 'Bad Request',
            description: 'invalid value passed to active',
            status: 400
          }));
      }
    }
    return next();
  },
  async (req, res, next) => {
    let marketId = req.query.marketId;
    // filter by marketId if not admin || superAdmin
    if (req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) {
      // return error if a non admin type attempts to filter by another market id
      if (req.query.marketId && req.query.marketId !== req.auth.marketId) {
        logger.error({ message: `User marketId: ${req.auth.marketId} denied access` });
        metrics.increment('errors');
        return next(new RESTError({
          message: 'Forbidden',
          description: 'Access denied. You are not authorized to access this resource.',
          status: 403
        }));
      }
      marketId = req.auth.marketId;
    }
    const { err, data: quotes } = await quotesController.list({
      id: req.query.id,
      clientId: req.auth.userType === roles.client ? req.auth.userId : undefined,
      providerId: req.auth.userType === roles.provider ? req.auth.userId : undefined,
      onBehalfOf: req.get('On-Behalf-Of'),
      marketId,
      rfqId: req.query.rfqId,
      active: req.query.active,
      offset: req.query.offset,
      limit: req.query.limit
    });
    if (err) {
      logger.debug({ message: 'error from quotes controller' });
      let filterErr = err;
      if (err instanceof InvalidParametersError) {
        filterErr = new RESTError({
          message: 'Bad Request',
          description: 'Invalid quote / market / rfq id, offset and/or limit',
          status: 400
        });
      }
      return next(filterErr);
    }
    req.quotes = quotes;
    res.status(200).json(req.quotes);
    return next();
  }
);

router.patch('/:id/accept',
  middlewares.checkAccess({ accessRoles: [roles.client] }),
  async (req, res, next) => {
    // get quote
    const { err, data } = await quotesController.get({ id: req.params.id });
    if (err) {
      let error = err;
      logger.debug({ message: 'error from quotes controller' });
      if (err instanceof InvalidParametersError) {
        error = new RESTError({ message: 'Bad Request', description: 'ID must be a uuid/v4', status: 400 });
      }
      if (err instanceof ResourceNotFoundError) {
        error = new RESTError({ message: 'Resource Not Found', description: `Quote with id: ${req.params.id} not found`, status: 404 });
      }
      return next(error);
    }

    req.quote = data;
    return next();
  },
  async (req, res, next) => {
    if (req.auth.userId !== req.quote.clientId) {
      logger.error({ message: `userId: ${req.auth.userId} denied access` });
      metrics.increment('errors');
      const error = new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource.',
        status: 403
      });
      return next(error);
    }
    return next();
  },
  async (req, res, next) => {
    // get market
    const { err, data } = await marketsController.get({ id: req.quote.marketId });
    if (err) {
      let error = err;
      logger.debug({ message: 'error from markets controller' });
      if (err instanceof InvalidParametersError) {
        error = new RESTError({ message: 'Bad Request', description: 'ID must be a uuid/v4', status: 400 });
      }
      if (err instanceof ResourceNotFoundError) {
        error = new RESTError({ message: 'Resource Not Found', description: `Market with id: ${req.params.id} not found`, status: 404 });
      }
      return next(error);
    }
    req.market = data;
    return next();
  },
  async (req, res, next) => {
    const { err } = Schema.compareAndValidate(req.market.acceptanceSchema, req.body);
    if (err) {
      logger.debug({ message: 'schema validation failed' });
      let error;
      switch (true) {
        case (err instanceof ValidationError):
          error = new RESTError({
            message: 'Bad Request',
            status: 400,
            description: 'See Errors',
            errors: err.errors
          });
          break;
        case (err instanceof SchemaNotFoundError):
          error = new RESTError({
            message: 'Internal Server Error',
            description: 'Unknown Error Occured',
            status: 500
          });
          break;
        default:
          error = err;
      }
      return next(error);
    }
    return next();
  },
  async (req, res, next) => {
    // check quote status is pending
    if (req.quote.status !== 'pending') {
      logger.info({ message: 'quote status not pending' });
      const error = new RESTError({
        message: 'Conflict',
        description: 'This quote is no longer pending',
        status: 409
      });
      return next(error);
    }
    return next();
  },
  async (req, res, next) => {
    // check quote has not expired
    if (new Date(req.quote.createdOn.getTime() + parseInt(req.quote.lifespan, 10)) < new Date()) {
      logger.error({ message: 'quote has expired' });
      metrics.increment('errors');
      const error = new RESTError({
        message: 'Gone',
        description: 'quote has expired',
        status: 410
      });
      return next(error);
    }
    return next();
  },
  async (req, res, next) => {
    const { err, data } = await quotesController.update({ id: req.quote.id, status: 'accept', acceptance: req.body });
    if (err) {
      logger.debug({ message: 'error from quotes controller' });
      return next(err);
    }
    req.quote = data;
    return next();
  },
  async (req, res, next) => {
    const { err, data } = await providersController.get({ id: req.quote.providerId });

    if (err) {
      logger.debug({ message: 'error from providers controller' });
      return next(err);
    }

    req.provider = data;
    return next();
  },
  async (req, res, next) => {
    const event = new Event()
      .setType('ACCEPT')
      .setEvent('CREATE')
      .setMarketId(req.market.id)
      .setData(req.quote);

    // dispatch
    const requests = [{
      [req.provider.id]: {
        url: req.provider.webhookUrl,
        headers: req.provider.webhookHeaders,
        method: 'POST',
        body: event,
        json: true
      }
    }];

    const { data } = await clientsController.get({ id: req.auth.userId });
    req.client = data;

    const onFail = async (failedRequest) => {
      req.quote.providerId = failedRequest.targetId;
      const failedEvent = new Event()
        .setType('ACCEPT')
        .setEvent('DELIVERY FAIL')
        .setMarketId(req.market.id)
        .setData(req.quote);
      const failedRequests = [{
        [req.auth.userId]: {
          uri: req.client.webhookUrl,
          headers: req.client.webhookHeaders,
          method: 'POST',
          body: failedEvent,
          json: true
        }
      }];
      await dispatchController.sendBatch({ batchId: req.quote.id, requests: failedRequests });
      metrics.increment('quote_accept_delivery_fail');
    };

    await dispatchController.sendBatch({ batchId: req.quote.id, requests, onFail });
    metrics.increment('quote_accept');

    logger.info({ message: 'QUOTE:ACCEPT SEGTIME', duration: Date.now() - req.quote.createdOn, provider: req.provider.id, client: req.auth.userId });
    res.status(200).json(req.quote);
    analyticsStream.writeEvent({ event });
    return next();
  }
);

router.patch('/:id/reject',
  middlewares.checkAccess({ accessRoles: [roles.client] }),
  async (req, res, next) => {
    // get quote
    const { err, data } = await quotesController.get({ id: req.params.id });
    if (err) {
      let error = err;
      logger.debug({ message: 'error from quotes controller' });
      if (err instanceof InvalidParametersError) {
        error = new RESTError({ message: 'Bad Request', description: 'ID must be a uuid/v4', status: 400 });
      }
      if (err instanceof ResourceNotFoundError) {
        error = new RESTError({ message: 'Resource Not Found', description: `Quote with id: ${req.params.id} not found`, status: 404 });
      }
      return next(error);
    }
    req.quote = data;
    return next();
  },
  async (req, res, next) => {
    // check client & quote belong in the same market
    // get client from auth
    if (req.auth.userId !== req.quote.clientId) {
      logger.error({ message: `userId: ${req.auth.userId} denied access` });
      metrics.increment('errors');
      return next(new RESTError({
        message: 'Forbidden',
        description: 'You do not have permission to access this resource',
        status: 403
      }));
    }
    return next();
  },
  async (req, res, next) => {
    // check quote status is pending
    if (req.quote.status !== 'pending') {
      logger.info({ message: 'quote status not pending' });
      return next(new RESTError({
        message: 'Conflict',
        description: 'This quote is no longer pending',
        status: 409
      }));
    }
    return next();
  },
  async (req, res, next) => {
    // check quote has not expired
    if (new Date(req.quote.createdOn.getTime() + parseInt(req.quote.lifespan, 10)) < new Date()) {
      logger.info({ message: 'quote expired' });
      return next(new RESTError({
        message: 'Gone',
        description: 'This quote is no longer active',
        status: 410
      }));
    }
    return next();
  },
  async (req, res, next) => {
    const { err, data } = await quotesController.update({ id: req.quote.id, status: 'reject' });
    if (err) {
      logger.debug({ message: 'error from quotes controller' });
      return next(err);
    }
    req.quote = data;
    return next();
  },
  async (req, res, next) => {
    const { err, data } = await providersController.get({ id: req.quote.providerId });
    if (err) {
      logger.debug({ message: 'error from providers controller' });
      return next(err);
    }

    req.provider = data;
    return next();
  },
  async (req, res, next) => {
    const event = new Event()
      .setType('REJECT')
      .setEvent('CREATE')
      .setMarketId(req.quote.marketId)
      .setData(req.quote);

    // dispatch
    const requests = [{
      [req.provider.id]: {
        url: req.provider.webhookUrl,
        headers: req.provider.webhookHeaders,
        method: 'POST',
        body: event,
        json: true
      }
    }];

    const { data } = await clientsController.get({ id: req.auth.userId });
    req.client = data;

    const onFail = async (failedRequest) => {
      req.quote.clientId = failedRequest.targetId;
      const failedEvent = new Event()
        .setType('REJECT')
        .setEvent('DELIVERY FAIL')
        .setMarketId(req.quote.marketId)
        .setData(req.quote);
      const failedRequests = [{
        [req.auth.userId]: {
          uri: req.client.webhookUrl,
          headers: req.client.webhookHeaders,
          method: 'POST',
          body: failedEvent,
          json: true
        }
      }];
      await dispatchController.sendBatch({ batchId: req.quote.id, requests: failedRequests });
      metrics.increment('quote_reject_delivery_fail');
    };

    await dispatchController.sendBatch({ batchId: req.quote.id, requests, onFail });
    metrics.increment('quote_reject');
    logger.info({ message: 'QUOTE:REJECT SEGTIME', duration: Date.now() - req.quote.createdOn, provider: req.provider.id, client: req.auth.userId });
    res.status(200).json(req.quote);
    analyticsStream.writeEvent({ event });
    return next();
  }
);

router.patch('/:id/complete',
  middlewares.checkAccess({ accessRoles: [roles.provider] }),
  async (req, res, next) => {
    const { err, data: quote } = await quotesController.get({ id: req.params.id });
    if (err) {
      let error = err;
      logger.debug({ message: 'error from quotes controller' });
      if (err instanceof InvalidParametersError) {
        error = new RESTError({ message: 'Bad Request', description: 'ID must be a uuid/v4', status: 400 });
      }
      if (err instanceof ResourceNotFoundError) {
        error = new RESTError({ message: 'Resource Not Found', description: `Quote with id: ${req.params.id} not found`, status: 404 });
      }
      return next(error);
    }
    if (quote.status !== 'accept') {
      const error = new RESTError({
        message: 'Conflict',
        description: 'This quote is no longer accepted',
        status: 409
      });
      return next(error);
    }
    if (quote.providerId !== req.auth.userId && req.auth.userType === roles.provider) {
      logger.error({ message: `userId: ${req.auth.userId} denied access` });
      metrics.increment('errors');
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource.',
        status: 403
      }));
    }
    req.quote = quote;
    return next();
  },
  async (req, res, next) => {
    const { err, data: market } = await marketsController.get({ id: req.quote.marketId });
    if (err) {
      logger.debug({ message: 'error from markets controller ' });
      return next(err);
    }
    req.market = market;
    return next();
  },
  async (req, res, next) => {
    const { err } = await Schema.compareAndValidate(req.market.completionSchema, req.body);
    if (err) {
      logger.debug({ message: 'schema validation failed' });
      let error;
      switch (true) {
        case (err instanceof ValidationError):
          error = new RESTError({
            message: 'Bad Request',
            status: 400,
            description: 'See Errors',
            errors: err.errors
          });
          break;
        case (err instanceof SchemaNotFoundError):
          error = new RESTError({
            message: 'Internal Server Error',
            description: 'Unknown Error Occured',
            status: 500
          });
          break;
        default:
          error = err;
      }
      return next(error);
    }
    return next();
  },
  async (req, res, next) => {
    const { err, data } = await quotesController.update({
      id: req.params.id,
      completion: req.body,
      status: 'complete'
    });
    if (err) {
      logger.debug({ message: 'error from quotes controller ' });
      return next(err);
    }
    req.quote = data;
    return next();
  },
  async (req, res, next) => {
    const { err, data: client } = await clientsController.get({ id: req.quote.clientId });
    if (err) {
      logger.debug({ message: 'error from clients controller ' });
      return next(err);
    }
    req.client = client;
    return next();
  },
  async (req, res, next) => {
    const { err, data: rfq } = await rfqsController.get({ id: req.quote.rfqId });
    if (err) {
      logger.debug({ message: 'error from rfqs controller ' });
      return next(err);
    }
    req.rfq = rfq;
    return next();
  },
  async (req, res, next) => {
    const event = new Event()
      .setType('COMPLETE')
      .setEvent('CREATE')
      .setMarketId(req.market.id)
      .setData(req.quote);
    const requests = [{
      [req.client.id]: {
        uri: req.client.webhookUrl,
        headers: req.client.webhookHeaders,
        method: 'POST',
        body: event,
        json: true
      }
    }];

    const { data } = await providersController.get({ id: req.auth.userId });
    req.provider = data;

    const onFail = async (failedRequest) => {
      req.quote.clientId = failedRequest.targetId;
      const failedEvent = new Event()
        .setType('COMPLETE')
        .setEvent('DELIVERY FAIL')
        .setMarketId(req.market.id)
        .setData(req.quote);
      const failedRequests = [{
        [req.auth.userId]: {
          uri: req.provider.webhookUrl,
          headers: req.provider.webhookHeaders,
          method: 'POST',
          body: failedEvent,
          json: true
        }
      }];
      await dispatchController.sendBatch({ batchId: req.quote.id, requests: failedRequests });
      metrics.increment('quote_completed_delivery_fail');
    };
    await dispatchController.sendBatch({ batchId: req.quote.id, requests, onFail });
    metrics.increment('quote_completed');

    logger.info({ message: 'ACCEPT:COMPLETE SEGTIME', duration: Date.now() - req.quote.updatedOn, client: req.client.id, provider: req.auth.userId });
    logger.info({ message: 'RFQ:COMPLETE SEGTIME', duration: Date.now() - req.rfq.createdOn, client: req.client.id, provider: req.auth.userId });
    res.status(200).json(req.quote);
    analyticsStream.writeEvent({ event });
    return next();
  },
);
module.exports = router;
