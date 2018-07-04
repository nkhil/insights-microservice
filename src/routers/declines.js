const express = require('express');
const {
  declinesController,
  rfqsController,
  clientsController,
  dispatchController,
  marketsController
} = require('../controllers');
const { roles } = require('../config');
const {
  MissingParametersError,
  RESTError,
  InvalidParametersError,
  ResourceNotFoundError
} = require('../errors');
const { Event } = require('../models');
const { analyticsStream, metrics } = require('../lib');
const logger = require('../logger');
const middlewares = require('../middlewares');

const router = express.Router();

router.post('/',
  middlewares.checkAccess({ accessRoles: [roles.provider] }),
  middlewares.schemaCheck('declines_post'),
  async (req, res, next) => {
    const { err, data } = await rfqsController.get({ id: req.body.rfqId });
    if (err) {
      logger.debug({ message: 'error from rfq controller' });
      let e = err;
      if (err instanceof MissingParametersError) {
        e = new RESTError({
          message: 'Bad Request',
          description: 'rfqId must be provided',
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
          description: `rfq with id: ${req.body.rfqId} not found`,
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
          description: `Client with id: ${req.rfq.client} not found`,
          status: 404
        });
      }
      return next(e);
    }
    req.client = data;
    return next();
  },

  async (req, res, next) => {
    const { err, data } = await declinesController.create({
      rfqId: req.rfq.id,
      marketId: req.market.id,
      clientId: req.client.id,
      providerId: req.auth.userId,
      reasons: req.body.reasons
    });
    if (err) {
      logger.debug({ message: 'error from declines controller ' });
      return next(new RESTError({
        message: 'Bad Request',
        description: 'Error from controller, failed to create decline',
        status: 400
      }));
    }
    req.decline = data;
    return next();
  },

  async (req, res, next) => {
    const event = new Event()
      .setType('DECLINE')
      .setEvent('CREATE')
      .setMarketId(req.market.id)
      .setData(req.decline);

    const requests = [{
      [req.client.id]: {
        uri: req.client.webhookUrl,
        headers: req.client.webhookHeaders,
        method: 'POST',
        body: event,
        json: true
      }
    }];
    await dispatchController.sendBatch({ batchId: req.rfq.id, requests });
    metrics.increment('decline_create');
    logger.info({ message: 'RFQ:DECLINE SEGTIME', duration: (Date.now() - req.rfq.createdOn), provider: req.auth.userId });
    res.status(201).location(`/decline/${req.decline.id}`).json(req.decline);
    analyticsStream.writeEvent({ event });
    return next();
  }
);

router.get('/:id',
  middlewares.checkAccess({
    accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin, roles.clientAdmin,
      roles.providerAdmin, roles.provider, roles.client]
  }),
  async (req, res, next) => {
    let err;
    let data = null;
    ({ err, data } = await declinesController.get({ id: req.params.id }));
    if (err) {
      logger.debug({ message: 'error from declines controller' });
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
    req.decline = data;
    return next();
  },
  async (req, res, next) => {
    if (req.auth.userType === roles.provider || req.auth.userType === roles.client) {
      if (req.decline.providerId !== req.auth.userId && req.decline.clientId !== req.auth.userId) {
        logger.error({ message: `userId: ${req.auth.userId} denied access` });
        metrics.increment('errors');
        return next(new RESTError({
          message: 'Forbidden',
          description: 'unauthorized access',
          status: 403
        }));
      }
    }
    res.status(200).json(req.decline);
    return next();
  }
);

router.get('/',
  middlewares.checkAccess({
    accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin,
      roles.clientAdmin, roles.providerAdmin, roles.provider, roles.client]
  }),
  middlewares.setOffsetLimit(),
  async (req, res, next) => {
    let marketId = req.query.marketId;
    // filter by marketId if not admin || superAdmin
    if (req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) {
      // return error if a non admin type attempts to filter by another market id
      if (req.query.marketId && req.query.marketId !== req.auth.marketId) {
        logger.error({ message: `User marketId: ${req.auth.marketId} denied access` });
        return next(new RESTError({
          message: 'Forbidden',
          description: 'Access denied. You are not authorized to access this resource.',
          status: 403
        }));
      }
      marketId = req.auth.marketId;
    }
    const { err, data } = await declinesController.list({
      clientId: req.auth.userType === 'client' ? req.auth.userId : undefined,
      providerId: req.auth.userType === 'provider' ? req.auth.userId : undefined,
      marketId,
      rfqId: req.query.rfqId,
      offset: req.query.offset,
      limit: req.query.limit
    });

    if (err) {
      logger.debug({ message: 'error from declines controller' });
      let filterErr = err;
      if (err instanceof MissingParametersError) {
        filterErr = new RESTError({
          message: 'Bad Request',
          description: 'Missing client or provider id',
          status: 400
        });
      }
      if (err instanceof InvalidParametersError) {
        filterErr = new RESTError({
          message: 'Bad Request',
          description: 'Invalid market id, rfq id, offset and/or limit',
          status: 400
        });
      }
      return next(filterErr);
    }

    res.status(200).json(data);
    return next();
  }
);

module.exports = router;
