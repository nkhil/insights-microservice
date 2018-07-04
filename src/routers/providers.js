const express = require('express');
const logger = require('../logger');
const {
  providersController,
  authController,
  marketsController
} = require('../controllers');
const middlewares = require('../middlewares');
const { roles } = require('../config');
const {
  DuplicateError,
  InvalidParametersError,
  MissingParametersError,
  ResourceNotFoundError,
  RESTError
} = require('../errors');
const { metrics } = require('../lib');

const router = express.Router();

router.post('/',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin,
    roles.marketAdmin, roles.providerAdmin] }),
  middlewares.schemaCheck('providers_post'),
  async (req, res, next) => {
    let err;
    let data;

    // trying to make client in market that is not your own
    if ((req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) &&
        req.body.marketId !== req.auth.marketId) {
      logger.error({ message: `User marketId: ${req.auth.marketId} denied access` });
      metrics.increment('errors');
      err = new RESTError({ message: 'Forbidden', description: 'Access denied. You are not authorized to access this resource', status: 403 });
      return next(err);
    }

    ({ err, data } = await marketsController.get({ id: req.body.marketId }));
    if (err) {
      logger.debug({ message: 'error from markets controller' });
      if (err instanceof MissingParametersError) {
        err = new RESTError({ message: 'Bad Request', description: 'marketId must be provided', status: 400 });
      }
      if (err instanceof InvalidParametersError) {
        err = new RESTError({ message: 'Bad Request', description: 'marketId must be a uuid/v4', status: 400 });
      }
      if (err instanceof ResourceNotFoundError) {
        err = new RESTError({ message: 'Resource Not Found', description: `Market with id: ${req.body.marketId} not found`, status: 404 });
      }
      return next(err);
    }
    ({ err, data } = await providersController.create({
      name: req.body.name,
      marketId: req.body.marketId
    }));
    if (err) {
      logger.debug({ message: 'error from providers controller' });
      if (err instanceof DuplicateError) {
        err = new RESTError({
          message: 'Conflict',
          description: 'Duplicate Provider Name',
          status: 409
        });
      }
      return next(err);
    }
    ({ err, data } = await providersController.update({
      id: data.id,
      description: req.body.description,
      webhookUrl: req.body.webhookUrl,
      webhookHeaders: req.body.webhookHeaders,
      filterSchema: req.body.filterSchema,
      imageUrl: req.body.imageUrl,
      locations: req.body.locations
    }));
    if (err) {
      logger.debug({ message: 'FATAL! Partial failure! No rollback after update failed' });
      return next(err);
    }
    ({ err, data: this.token } = await authController.create({
      userType: roles.provider,
      userId: data.id,
      marketId: req.body.marketId
    }));
    if (err) {
      logger.debug({ message: 'FATAL! Partial failure! No rollback after update failed => ERROR from authcontroller' });
      return next(err);
    }
    data.token = this.token;
    res.status(201).location(`/providers/${data.id}`).json(data);
    return next();
  });

router.get('/',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin,
    roles.clientAdmin, roles.client, roles.providerAdmin, roles.provider] }),
  middlewares.setOffsetLimit(),
  async (req, res, next) => {
    if ((req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) &&
    (req.query.marketId && req.query.marketId !== req.auth.marketId)) {
      logger.error({ message: `User marketId: ${req.auth.marketId} denied access` });
      metrics.increment('errors');
      const err = new RESTError({ message: 'Forbidden', description: 'Access denied. You are not authorized to access this resource', status: 403 });
      return next(err);
    }
    return next();
  },
  async (req, res, next) => {
    const location = {
      long: req.query.long,
      lat: req.query.lat,
      radius: req.query.radius
    };
    // checks that either ALL values are undefined or NONE are undefined
    if ((Object.values(location).some(x => typeof x !== 'undefined')
        && Object.values(location).includes(undefined))) {
      logger.error({ message: 'invalid location, must provide all values or none' });
      metrics.increment('errors');
      return next(new RESTError({
        message: 'Bad Request',
        description: 'invalid location values, must provide all or none',
        status: 400
      }));
    }
    return next();
  },
  async (req, res, next) => {
    let marketId = req.query.marketId;
    if (req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) {
      marketId = req.auth.marketId;
    }
    let providerId;
    if (req.auth.userType === roles.provider) {
      providerId = req.auth.userId;
    }
    const { err, data } = await providersController.list({
      offset: req.query.offset,
      limit: req.query.limit,
      marketId,
      providerId,
      location: { long: req.query.long, lat: req.query.lat, radius: req.query.radius }
    });
    if (err) {
      logger.debug({ message: 'error from providers controller' });
      return next(new RESTError({
        message: 'Bad Request',
        description: 'Invalid id, market id, offset, limit, and/or location',
        status: 400
      }));
    }
    res.status(200).json(data);
    return next();
  });

router.get('/:id',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin,
    roles.providerAdmin, roles.provider, roles.clientAdmin, roles.client] }),
  async (req, res, next) => {
    if (req.params.id !== req.auth.userId && req.auth.userType === roles.provider) {
      logger.debug({ message: `userId: ${req.auth.userId} denied access` });
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource',
        status: 403
      }));
    }
    return next();
  },
  async (req, res, next) => {
    const { err, data } = await providersController.get({ id: req.params.id });
    let error = err;
    if (error) {
      logger.debug({ message: 'error from providers controller' });
      if (err instanceof InvalidParametersError) {
        error = new RESTError({ message: 'Bad Request', description: 'ID must be a uuid/v4', status: 400 });
      }
      if (err instanceof ResourceNotFoundError) {
        error = new RESTError({ message: 'Resource Not Found', description: `Provider with id: ${req.params.id} not found`, status: 404 });
      }
      return next(error);
    }

    // trying to access a market that is forbidden
    if ((req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) &&
        data.marketId !== req.auth.marketId) {
      logger.debug({ message: `User marketId: ${req.auth.marketId} denied access` });
      error = new RESTError({ message: 'Forbidden', description: 'Access denied. You are not authorized to access this resource.', status: 403 });
      return next(error);
    }
    res.status(200).json(data);
    return next();
  });

router.patch('/:id',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin,
    roles.providerAdmin, roles.provider] }),
  async (req, res, next) => {
    if (req.params.id !== req.auth.userId && req.auth.userType === roles.provider) {
      logger.debug({ message: `userId: ${req.auth.userId} denied access` });
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource',
        status: 403
      }));
    }
    return next();
  },
  middlewares.schemaCheck('providers_patch'),
  async (req, res, next) => {
    const { err, data } = await providersController.get({ id: req.params.id });
    if (err) {
      let error = err;
      logger.debug({ message: 'error from providers controller' });
      if (err instanceof InvalidParametersError) {
        error = new RESTError({ message: 'Bad Request', description: 'ID must be a uuid/v4', status: 400 });
      }
      if (err instanceof ResourceNotFoundError) {
        error = new RESTError({ message: 'Resource Not Found', description: `Provider with id: ${req.params.id} not found`, status: 404 });
      }
      return next(error);
    }

    // trying to update a provider in another market
    if ((req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) &&
        data.marketId !== req.auth.marketId) {
      logger.debug({ message: `User marketId: ${req.auth.marketId} denied access` });
      return next(new RESTError({
        message: 'Forbidden',
        description: `user marketId: ${req.auth.marketId} denied access`,
        status: 403
      }));
    }
    return next();
  },
  async (req, res, next) => {
    const { err, data } = await providersController.update({
      id: req.params.id,
      name: req.body.name,
      description: req.body.description,
      webhookUrl: req.body.webhookUrl,
      webhookHeaders: req.body.webhookHeaders,
      filterSchema: req.body.filterSchema,
      imageUrl: req.body.imageUrl,
      locations: req.body.locations
    });
    if (err) {
      let error = err;
      logger.debug({ message: 'error from providers controller' });
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
          description: `Provider with id: ${req.params.id} not found`,
          status: 404
        });
      }
      if (err instanceof DuplicateError) {
        error = new RESTError({
          message: 'Conflict',
          description: 'Duplicate Provider Name',
          status: 409
        });
      }
      return next(error);
    }
    res.status(200).json(data);
    return next();
  });

router.delete('/:id',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin,
    roles.providerAdmin, roles.provider] }),
  async (req, res, next) => {
    if (req.params.id !== req.auth.userId && req.auth.userType === roles.provider) {
      logger.debug({ message: `userId: ${req.auth.userId} denied access` });
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource',
        status: 403
      }));
    }
    return next();
  },
  async (req, res, next) => {
    const { err, data } = await providersController.get({ id: req.params.id });
    if (err) {
      let error = err;
      logger.debug({ message: 'error from providers controller' });
      if (err instanceof InvalidParametersError) {
        error = new RESTError({ message: 'Bad Request', description: 'ID must be a uuid/v4', status: 400 });
      }
      if (err instanceof ResourceNotFoundError) {
        error = new RESTError({ message: 'Resource Not Found', description: `Provider with id: ${req.params.id} not found`, status: 404 });
      }
      return next(error);
    }
    // trying to delete a provider in another market
    if ((req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) &&
        data.marketId !== req.auth.marketId) {
      logger.debug({ message: 'Access denied' });
      const error = new RESTError({ message: 'Forbidden', description: 'Access denied. You are not authorized to access this resource', status: 403 });
      return next(error);
    }
    return next();
  },
  async (req, res, next) => {
    const { err } = await providersController.delete({
      id: req.params.id
    });
    if (err) {
      logger.debug({ message: 'error from providers controller' });
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
          description: `Provider with id: ${req.params.id} not found`,
          status: 404
        });
      }
      return next(error);
    }
    res.status(204).send();
    return next();
  });

router.get('/:id/revisions',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin,
    roles.providerAdmin, roles.provider] }),
  async (req, res, next) => {
    if (req.params.id !== req.auth.userId && req.auth.userType === roles.provider) {
      logger.debug({ message: `userId: ${req.auth.userId} denied access` });
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource',
        status: 403
      }));
    }
    return next();
  },
  middlewares.setOffsetLimit(),
  async (req, res, next) => {
    const { err, data } = await providersController.get({ id: req.params.id });
    if (err) {
      logger.debug({ message: 'error from providers controller' });
      let error = err;
      if (err instanceof InvalidParametersError) {
        error = new RESTError({ message: 'Bad Request', description: 'ID must be a uuid/v4', status: 400 });
      }
      if (err instanceof ResourceNotFoundError) {
        error = new RESTError({ message: 'Resource Not Found', description: `Provider with id: ${req.params.id} not found`, status: 404 });
      }
      return next(error);
    }
    // trying to access forbidden markets
    if ((req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) &&
        data.marketId !== req.auth.marketId) {
      logger.debug({ message: `User marketId: ${req.auth.marketId} denied access` });
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized ot access this resource',
        status: 403
      }));
    }
    return next();
  },
  async (req, res, next) => {
    const { err, data } = await providersController.listRevisions({
      id: req.params.id,
      offset: req.query.offset,
      limit: req.query.limit
    });

    if (err) {
      logger.debug({ message: 'error from providers controller' });
      let e = err;
      if (e instanceof InvalidParametersError) {
        e = new RESTError({ message: 'Bad Request', description: 'Invalid values for id and/or offset and/or limit', status: 400 });
      }
      if (e instanceof ResourceNotFoundError) {
        e = new RESTError({ message: 'Resource Not Found', description: `Provider with id: ${req.params.id} not found`, status: 404 });
      }
      return next(e);
    }

    res.status(200).json(data);
    return next();
  });

router.get('/:id/revisions/:revisionId',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin,
    roles.providerAdmin, roles.provider] }),
  async (req, res, next) => {
    if (req.params.id !== req.auth.userId && req.auth.userType === roles.provider) {
      logger.debug({ message: `userId: ${req.auth.userId} denied access` });
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource',
        status: 403
      }));
    }
    return next();
  },
  async (req, res, next) => {
    const { err, data } = await providersController.getRevision({
      id: req.params.id,
      revisionId: req.params.revisionId
    });
    if (err) {
      logger.debug({ message: 'error from providers controller' });
      let e = err;
      if (e instanceof InvalidParametersError) {
        e = new RESTError({ message: 'Bad Request', description: 'Invalid values for id and/or revisionId', status: 400 });
      } else if (e instanceof ResourceNotFoundError) {
        e = new RESTError({ message: 'Resource Not Found', description: `Provider/revision with id: ${req.params.id} / ${req.params.revisionId} not found`, status: 404 });
      }
      return next(e);
    }

    // trying to access a resource outisde of your market
    if ((req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) &&
        data.marketId !== req.auth.marketId) {
      logger.debug({ message: `User marketId: ${req.auth.marketId} denied access` });
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource',
        status: 404
      }));
    }
    res.status(200).json(data);
    return next();
  });

module.exports = router;
