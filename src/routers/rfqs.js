const express = require('express');
const logger = require('../logger');
const middlewares = require('../middlewares');
const { roles } = require('../config');
const Promise = require('bluebird');
const {
  rfqsController,
  clientsController,
  marketsController,
  providersController,
  declinesController,
  dispatchController
} = require('../controllers');
const { Schema, ValidationError, SchemaNotFoundError } = require('../schema');
const { Event } = require('../models');
const { analyticsStream, metrics } = require('../lib');
const {
  InvalidParametersError,
  MissingParametersError,
  ResourceNotFoundError,
  RESTError
} = require('../errors');

const router = express.Router();

router.post('/',
  middlewares.checkAccess({ accessRoles: [roles.client] }),
  middlewares.schemaCheck('rfqs_post'),
  // get the market
  async (req, res, next) => {
    let err;
    let data = null;
    ({ err, data } = await marketsController.get({ id: req.auth.marketId }));
    if (err) {
      logger.debug({ message: 'error from markets controller' });
      if (err instanceof MissingParametersError) {
        err = new RESTError({ message: 'Bad Request', description: 'marketId must be provided', status: 400 });
      }
      if (err instanceof InvalidParametersError) {
        err = new RESTError({ message: 'Bad Request', description: 'marketId must be a uuid/v4', status: 400 });
      }
      if (err instanceof ResourceNotFoundError) {
        err = new RESTError({ message: 'Resource Not Found', description: `Market with id: ${req.auth.marketId} not found`, status: 404 });
      }
      return next(err);
    }
    // check market is still active
    if (data.isActive !== true) {
      logger.error({ message: 'market is inactive' });
      metrics.increment('errors');
      err = new RESTError({
        message: 'Resource Not Found',
        description: 'market is inactive',
        status: 404
      });
      return next(err);
    }
    // validate the payload against the market schema
    ({ err } = Schema.compareAndValidate(data.rfqSchema, req.body.payload));
    if (err) {
      logger.debug({ message: 'schema validation failed' });
      switch (true) {
        case (err instanceof ValidationError):
          err = new RESTError({
            message: 'Bad Request',
            status: 400,
            description: 'See Errors',
            errors: err.errors
          });
          break;
        case (err instanceof SchemaNotFoundError):
          err = new RESTError({
            message: 'Internal Server Error',
            description: 'Unknown Error Occured',
            status: 500
          });
          break;
        default:
      }
      return next(err);
    }
    req.market = data;
    return next();
  },
  // gets all of the providers
  async (req, res, next) => {
    const { err, data: providers } = await providersController.list({
      ids: req.body.requestGroup,
      limit: req.body.requestGroup.length
    });

    if (err) {
      logger.debug({ message: 'error from providers controller' });
      let e = err;
      if (err instanceof MissingParametersError) {
        e = new RESTError({
          message: 'Bad Request',
          description: 'providerId must be provided',
          status: 400
        });
      }
      if (err instanceof InvalidParametersError) {
        e = new RESTError({
          message: 'Bad Request',
          description: 'ids must be an array, filled with providerIds in a valid uuid/v4 format',
          status: 400
        });
      }
      return next(e);
    }
    if (providers.length < req.body.requestGroup.length) {
      const error = new RESTError({
        message: 'Resource Not Found',
        description: 'one or more providers not found',
        status: 404
      });
      return next(error);
    }
    if (!providers.every(provider => provider.marketId === req.auth.marketId)) {
      return next(new RESTError({
        message: 'Bad Request',
        description: `providers must be in market ${req.market.id}`,
        status: 400
      }));
    }
    req.providers = providers;
    return next();
  },
  // get the client
  async (req, res, next) => {
    const { err, data: client } = await clientsController.get({ id: req.auth.userId });
    if (err) {
      logger.debug({ message: 'error from clients controller' });
      let e = err;
      if (err instanceof MissingParametersError) {
        e = new RESTError({
          message: 'Bad Request',
          description: 'client id must be provided',
          status: 400
        });
      }
      if (err instanceof InvalidParametersError) {
        e = new RESTError({
          message: 'Bad Request',
          description: 'client id must be a uuid/v4',
          status: 400
        });
      }
      if (err instanceof ResourceNotFoundError) {
        e = new RESTError({
          message: 'Resource Not Found',
          description: `Client with id: ${req.auth.userId} not found`,
          status: 404
        });
      }
      return next(e);
    }

    req.client = client;
    return next();
  },
  // create the rfq
  async (req, res, next) => {
    const { err, data } = await rfqsController.create({
      clientId: req.client.id,
      marketId: req.market.id,
      lifespan: req.body.lifespan || req.market.rfqDefaultLifespan,
      payload: req.body.payload,
      requestGroup: req.body.requestGroup,
      onBehalfOf: req.body.onBehalfOf
    });
    if (err) {
      logger.debug({ message: 'error from rfqs controller' });
      return next(err);
    }
    delete data.onBehalfOf;
    req.rfq = data;
    return next();
  },
  // set up and send the rfq and decline dispatch requests
  async (req, res, next) => {
    const event = new Event()
      .setType('RFQ')
      .setEvent('CREATE')
      .setMarketId(req.market.id)
      .setData({
        id: req.rfq.id,
        payload: req.rfq.payload,
        expiresAt: Date.now() + req.rfq.lifespan,
        createdOn: req.rfq.createdOn
      });
    const analyticsEvent = Object.assign({}, event, req.rfq);
    // removes environment from event object to ensure it does not get sent to the dispatcher
    delete event.environment;
    let requests = await Promise.map(
      req.providers, async (provider) => {
        // validate payload against client filterSchema
        const { err: schemaErr } = Schema.compareAndValidate(
          provider.filterSchema, req.body.payload);

        let request;
        if (schemaErr) {
          logger.debug({ message: `rfq did not pass filter schema for provider: ${provider.id}` });
          const { err, data: decline } = await declinesController.create({
            rfqId: req.rfq.id,
            marketId: req.market.id,
            clientId: req.auth.userId,
            providerId: provider.id,
            reasons: schemaErr.errors.map(e => ({ schemaPath: e.schemaPath, message: e.message }))
          });
          // if controller fails to create decline, log the error and don't add to requests
          if (err) {
            logger.debug({ message: `error from declines controller, failed to create decline for provider ${provider.id}` });
          }
          // sets the request to be a Decline if it was created successfully
          if (decline) {
            const declineEvent = new Event()
              .setType('DECLINE')
              .setEvent('CREATE')
              .setMarketId(req.market.id)
              .setData(decline);

            request = {
              [req.client.id]: {
                uri: req.client.webhookUrl,
                headers: req.client.webhookHeaders,
                method: 'POST',
                body: declineEvent,
                json: true
              }
            };
          }
        // if it passed the Schema check, sets up request to the provider
        } else {
          request = {
            [provider.id]: {
              uri: provider.webhookUrl,
              headers: provider.webhookHeaders,
              method: 'POST',
              body: event,
              json: true
            }
          };
        }
        return request;
      });
    // clears out any undefined values, in case declinesController.create failed
    requests = requests.filter(request => typeof request !== 'undefined');
    const { data } = await clientsController.get({ id: req.auth.userId });
    req.client = data;

    const onFail = async (failedRequest) => {
      const failedEvent = new Event()
        .setType('RFQ')
        .setEvent('DELIVERY FAIL')
        .setMarketId(req.market.id)
        .setData({
          id: req.rfq.id,
          payload: req.rfq.payload,
          expiresAt: Date.now() + req.rfq.lifespan,
          providerId: failedRequest.targetId
        });
      const failedRequests = [{
        [req.auth.userId]: {
          uri: req.client.webhookUrl,
          headers: req.client.webhookHeaders,
          method: 'POST',
          body: failedEvent,
          json: true
        }
      }];
      await dispatchController.sendBatch({ batchId: req.rfq.id, requests: failedRequests });
      metrics.increment('rfq_created_delivery_fail');
    };

    await dispatchController.sendBatch({ batchId: req.rfq.id, requests, onFail });
    metrics.increment('rfq_created');

    res.status(201).location(`/rfqs/${req.rfq.id}`).json(req.rfq);
    analyticsStream.writeEvent({ event: analyticsEvent });
    return next();
  });

router.get('/:id',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin,
    roles.clientAdmin, roles.client, roles.providerAdmin, roles.provider] }),
  async (req, res, next) => {
    const { err, data: rfq } = await rfqsController.get({
      id: req.params.id,
      onBehalfOf: req.get('On-Behalf-Of')
    });
    if (err) {
      logger.debug({ message: 'error from rfqs controller' });
      let error = err;
      if (err instanceof InvalidParametersError) {
        error = new RESTError({
          message: 'Bad Request',
          description: 'ID must be a uuid/v4',
          status: 400
        });
      }
      if (err instanceof ResourceNotFoundError) {
        error = new RESTError({
          message: 'Resource Not Found',
          description: `Rfq with id: ${req.params.id} not found`,
          status: 404
        });
      }
      return next(error);
    }
    // if not superAdmin or admin, checks the market id of the rfq
    if (req.auth.userType !== roles.superAdmin
      && req.auth.userType !== roles.admin
      && req.auth.marketId !== rfq.marketId) {
      logger.error({ message: `User marketId: ${req.auth.marketId} denied access` });
      metrics.increment('errors');
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource.',
        status: 403
      }));
    }
    // checks client id of the rfq matches user id
    if (req.auth.userType === roles.client && rfq.clientId !== req.auth.userId) {
      logger.error({ message: `userId: ${req.auth.userId} denied access` });
      metrics.increment('errors');
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource.',
        status: 403
      }));
    }
    // checks the provider accessing the rfq is in the request group
    if (req.auth.userType === roles.provider) {
      if (!rfq.requestGroup.includes(req.auth.userId)) {
        logger.error({ message: `userId: ${req.auth.userId} not in the request group` });
        metrics.increment('errors');
        return next(new RESTError({
          message: 'Forbidden',
          description: 'Access denied. You are not authorized to access this resource.',
          status: 403
        }));
      }
    }
    res.status(200).json(rfq);
    return next();
  }
);

router.get('/:id/status',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin,
    roles.clientAdmin, roles.client, roles.providerAdmin] }),
  async (req, res, next) => {
    const { err, data: rfq } = await rfqsController.get({ id: req.params.id });
    if (err) {
      logger.debug({ message: 'error from controller' });
      let error = err;
      if (err instanceof InvalidParametersError) {
        error = new RESTError({
          message: 'Bad Request',
          description: 'ID must be a uuid/v4',
          status: 400
        });
      }
      if (err instanceof ResourceNotFoundError) {
        error = new RESTError({
          message: 'Resource Not Found',
          description: `Rfq with id: ${req.params.id} not found`,
          status: 404
        });
      }
      return next(error);
    }
    switch (true) {
      // if not superAdmin or admin, checks the market id of the rfq
      // if client, checks client id of the rfq matches user id
      // if provider, checks the provider accessing the rfq is in the request group
      case (req.auth.userType !== roles.superAdmin
        && req.auth.userType !== roles.admin
        && req.auth.marketId !== rfq.marketId):
      case (req.auth.userType === roles.client && rfq.clientId !== req.auth.userId):
      case (req.auth.userType === roles.provider && !rfq.requestGroup.includes(req.auth.userId)):
        logger.error({ message: 'unauthorized to access rfq' });
        metrics.increment('errors');
        return next(new RESTError({
          message: 'Forbidden',
          description: 'unauthorized to access rfq',
          status: 403
        }));
      default:
        return next();
    }
  },

  async (req, res, next) => {
    const { err, data } = await dispatchController.getBatch({ batchId: req.params.id });
    if (err) {
      logger.debug({ message: 'error from dispatch controller' });
      if (err instanceof InvalidParametersError) {
        const error = new RESTError({
          message: 'Bad Request',
          description: 'ID must be a uuid/v4',
          status: 400
        });
        return next(error);
      }
      return next(err);
    }
    res.status(200).json(data);
    return next();
  }
);

router.get('/',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin,
    roles.providerAdmin, roles.provider, roles.clientAdmin, roles.client] }),
  middlewares.setOffsetLimit(),
  async (req, res, next) => {
    // if not superAdmin or admin, checks the marketId query string matches the marketId of user
    if (req.query.marketId && req.query.marketId !== req.auth.marketId &&
      req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) {
      logger.debug({ message: `User marketId: ${req.auth.marketId} denied access` });
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource',
        status: 403
      }));
    }
    return next();
  },
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
    let marketId = req.query.marketId;
    // filter by marketId if not admin || superAdmin
    if (req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) {
      marketId = req.auth.marketId;
    }

    let err;
    let data = null;

    ({ err, data } = await rfqsController.list({
      id: req.query.id,
      clientId: req.auth.userType === roles.client ? req.auth.userId : req.query.clientId,
      providerId: req.auth.userType === roles.provider ? req.auth.userId : undefined,
      marketId,
      onBehalfOf: req.get('On-Behalf-Of'),
      active: req.query.active,
      offset: req.query.offset,
      limit: req.query.limit
    }));

    if (err) {
      logger.debug({ message: 'error from controller' });
      if (err instanceof InvalidParametersError) {
        err = new RESTError({
          message: 'Bad Request',
          description: 'Invalid clientId, marketId, offset and/or limit',
          status: 400
        });
      }
      return next(err);
    }
    req.rfqs = data;
    res.status(200).json(req.rfqs);
    return next();
  }
);

module.exports = router;
