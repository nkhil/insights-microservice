const express = require('express');
const logger = require('../logger');
const middlewares = require('../middlewares');
const { roles } = require('../config');
const { clientsController, authController, marketsController } = require('../controllers');
const {
  DuplicateError,
  MissingParametersError,
  InvalidParametersError,
  ResourceNotFoundError,
  RESTError
} = require('../errors');
const { metrics } = require('../lib');

const router = express.Router();

router.post('/',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin,
    roles.marketAdmin, roles.clientAdmin] }),
  middlewares.schemaCheck('clients_post'),
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
      if (err instanceof MissingParametersError) {
        logger.debug({ message: 'error from markets controller' });
        err = new RESTError({ message: 'Bad Request', description: 'marketId must be provided', status: 400 });
      }
      if (err instanceof InvalidParametersError) {
        logger.debug({ message: 'error from markets controller' });
        err = new RESTError({ message: 'Bad Request', description: 'marketId must be a uuid/v4', status: 400 });
      }
      if (err instanceof ResourceNotFoundError) {
        logger.debug({ message: 'error from markets controller' });
        err = new RESTError({ message: 'Resource Not Found', description: `Market with id: ${req.body.marketId} not found`, status: 404 });
      }
      return next(err);
    }
    ({ err, data } = await clientsController.create({
      name: req.body.name,
      marketId: req.body.marketId
    }));
    if (err) {
      let error = err;
      logger.debug({ message: 'error from clients controller' });
      if (err instanceof DuplicateError) {
        error = new RESTError({
          message: 'Conflict',
          description: 'Duplicate Client Name',
          status: 409
        });
      }
      return next(error);
    }
    ({ err, data } = await clientsController.update({
      id: data.id,
      description: req.body.description,
      webhookUrl: req.body.webhookUrl,
      webhookHeaders: req.body.webhookHeaders
    }));
    if (err) {
      logger.debug({ message: 'FATAL! Partial failure! No rollback after update failed' });
      return next(err);
    }
    ({ err, data: this.token } = await authController.create({
      userType: roles.client,
      userId: data.id,
      marketId: req.body.marketId
    }));
    if (err) {
      logger.debug({ message: 'FATAL! Partial failure! No rollback after update failed => ERROR from authcontroller' });
      return next(err);
    }
    data.token = this.token;
    res.status(201).location(`/clients/${data.id}`).json(data);
    return next();
  });

router.get('/',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin,
    roles.marketAdmin, roles.clientAdmin, roles.client] }),
  middlewares.setOffsetLimit(),
  async (req, res, next) => {
    if (req.query.marketId) {
      // trying to get clients from a forbidden market
      if ((req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) &&
          req.query.marketId !== req.auth.marketId) {
        logger.debug({ message: `User marketId: ${req.auth.marketId} denied access` });
        return next(new RESTError({
          message: 'Forbidden',
          description: 'Access denied. You are not authorized to access this resource',
          status: 403
        }));
      }
    }
    return next();
  },
  async (req, res, next) => {
    let marketId = req.query.marketId;
    if (req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) {
      marketId = req.auth.marketId;
    }
    const { err, data } = await clientsController.list({
      marketId,
      clientId: req.auth.userId,
      offset: req.query.offset,
      limit: req.query.limit
    });
    if (err) {
      logger.debug({ message: 'error from controller' });
      let e = err;
      if (e instanceof InvalidParametersError) {
        e = new RESTError({ message: 'Bad Request', description: 'Invalid values for offset/limit/marketId', status: 400 });
      }
      return next(e);
    }
    res.status(200).json(data);
    return next();
  });

router.get('/:id',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin,
    roles.marketAdmin, roles.clientAdmin, roles.client] }),
  async (req, res, next) => {
    if (req.params.id !== req.auth.userId && req.auth.userType === roles.client) {
      logger.debug({ message: `UserId: ${req.auth.userId} denied access` });
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource',
        status: 403
      }));
    }
    return next();
  },
  async (req, res, next) => {
    const { err, data } = await clientsController.get({ id: req.params.id });
    if (err) {
      logger.debug({ message: 'error from clients controller' });
      let error = err;
      if (error instanceof InvalidParametersError) {
        error = new RESTError({ message: 'Bad Request', description: 'ID must be a uuid/v4', status: 400 });
      }
      if (error instanceof ResourceNotFoundError) {
        error = new RESTError({ message: 'Resource Not Found', description: `Client with id: ${req.params.id} not found`, status: 404 });
      }
      return next(error);
    }
    // trying to get clients from a forbidden market
    if ((req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) &&
        data.marketId !== req.auth.marketId) {
      logger.debug({ message: 'Access denied' });
      return next(new RESTError({ message: 'Forbidden', description: 'Access denied. You are not authorized to access this resource', status: 403 }));
    }
    res.status(200).json(data);
    return next();
  });

router.patch('/:id',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin,
    roles.clientAdmin, roles.client] }),
  async (req, res, next) => {
    if (req.params.id !== req.auth.userId && req.auth.userType === roles.client) {
      logger.debug({ message: `userId: ${req.auth.userId} denied access` });
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource',
        status: 403
      }));
    }
    return next();
  },
  middlewares.schemaCheck('clients_patch'),
  async (req, res, next) => {
    const { err, data } = await clientsController.get({ id: req.params.id });
    if (err) {
      logger.debug({ message: 'error from clients controller' });
      let error = err;
      if (err instanceof InvalidParametersError) {
        error = new RESTError({ message: 'Bad Request', description: 'ID must be a uuid/v4', status: 400 });
      }
      if (err instanceof ResourceNotFoundError) {
        error = new RESTError({ message: 'Resource Not Found', description: `Client with id: ${req.params.id} not found`, status: 404 });
      }
      return next(error);
    }

    // trying to access a market you shouldn't
    if ((req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) &&
        data.marketId !== req.auth.marketId) {
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
    const { err, data } = await clientsController.update({
      id: req.params.id,
      ...req.body
    });
    if (err) {
      logger.debug({ message: 'error from clients controller' });
      if (err instanceof InvalidParametersError) {
        const error = new RESTError({
          message: 'Bad Request',
          description: 'ID must be a uuid/v4',
          status: 400
        });
        return next(error);
      }
      if (err instanceof ResourceNotFoundError) {
        const error = new RESTError({
          message: 'Resource Not Found',
          description: `Client with id: ${req.params.id} not found`,
          status: 404
        });
        return next(error);
      }
      if (err instanceof DuplicateError) {
        const error = new RESTError({
          message: 'Conflict',
          description: 'Duplicate Client Name',
          status: 409
        });
        return next(error);
      }
      return next(err);
    }
    res.status(200).json(data);
    return next();
  });

router.delete('/:id',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin,
    roles.clientAdmin, roles.client] }),
  async (req, res, next) => {
    if (req.params.id !== req.auth.userId && req.auth.userType === roles.client) {
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
    const { err, data } = await clientsController.get({ id: req.params.id });
    if (err) {
      logger.debug({ message: 'error from clients controller' });
      if (err instanceof InvalidParametersError) {
        const error = new RESTError({ message: 'Bad Request', description: 'ID must be a uuid/v4', status: 400 });
        return next(error);
      }
      if (err instanceof ResourceNotFoundError) {
        const error = new RESTError({ message: 'Resource Not Found', description: `Client with id: ${req.params.id} not found`, status: 404 });
        return next(error);
      }
      return next(err);
    }

    // trying to delete resource in different market
    if ((req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) &&
        data.marketId !== req.auth.marketId) {
      logger.debug({ message: `User marketId: ${req.auth.marketId} denied access` });
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource.',
        status: 403
      }));
    }
    return next();
  },
  async (req, res, next) => {
    const { err } = await clientsController.delete({ id: req.params.id });
    if (err) {
      logger.debug({ message: 'error from clients controller' });
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
          description: `Client with id: ${req.params.id} not found`,
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
    roles.clientAdmin, roles.client] }),
  middlewares.setOffsetLimit(),
  async (req, res, next) => {
    if (req.params.id !== req.auth.userId && req.auth.userType === roles.client) {
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
    const { err, data } = await clientsController.get({ id: req.params.id });
    if (err) {
      let error = err;
      logger.debug({ message: 'error from clients controller' });
      if (err instanceof InvalidParametersError) {
        error = new RESTError({ message: 'Bad Request', description: 'ID must be a uuid/v4', status: 400 });
      }
      if (err instanceof ResourceNotFoundError) {
        error = new RESTError({ message: 'Resource Not Found', description: `Client with id: ${req.params.id} not found`, status: 404 });
      }
      return next(error);
    }
    // trying to access market that is not your own
    if (data.marketId !== req.auth.marketId &&
        (req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin)) {
      logger.debug({ message: `User marketId: ${req.auth.userId} denied access` });
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource.',
        status: 403
      }));
    }
    return next();
  },
  async (req, res, next) => {
    const { err, data } = await clientsController.listRevisions({
      id: req.params.id,
      offset: req.query.offset,
      limit: req.query.limit
    });

    if (err) {
      logger.debug({ message: 'error from clients controller' });
      let e = err;
      if (e instanceof InvalidParametersError) {
        e = new RESTError({ message: 'Bad Request', description: 'Invalid values for id and/or offset and/or limit', status: 400 });
      }
      if (e instanceof ResourceNotFoundError) {
        e = new RESTError({ message: 'Resource Not Found', description: `Client with id: ${req.params.id} not found`, status: 404 });
      }
      return next(e);
    }
    res.status(200).json(data);
    return next();
  }
);

router.get('/:id/revisions/:revisionId',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin,
    roles.clientAdmin, roles.client] }),
  async (req, res, next) => {
    if (req.params.id !== req.auth.userId && req.auth.userType === roles.client) {
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
    const { err, data } = await clientsController.get({ id: req.params.id });
    if (err) {
      let error = err;
      logger.debug({ message: 'error from clienst controller' });
      if (err instanceof InvalidParametersError) {
        error = new RESTError({ message: 'Bad Request', description: 'ID must be a uuid/v4', status: 400 });
      }
      if (err instanceof ResourceNotFoundError) {
        error = new RESTError({ message: 'Resource Not Found', description: `Client with id: ${req.params.id} not found`, status: 404 });
      }
      return next(error);
    }
    // trying to access a market that is not your own
    if ((req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) &&
        data.marketId !== req.auth.marketId) {
      logger.debug({ message: `User marketId: ${req.auth.userId} denied access` });
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource.',
        status: 403
      }));
    }
    return next();
  },
  async (req, res, next) => {
    const { err, data } = await clientsController.getRevision({
      id: req.params.id,
      revisionId: req.params.revisionId
    });
    if (err) {
      logger.debug({ message: 'error from clients controller' });
      let e = err;
      if (e instanceof InvalidParametersError) {
        e = new RESTError({ message: 'Bad Request', description: 'Invalid values for id and/or revisionId', status: 400 });
      } else if (e instanceof ResourceNotFoundError) {
        e = new RESTError({ message: 'Resource Not Found', description: `Client/revision with id: ${req.params.id} / ${req.params.revisionId} not found`, status: 404 });
      }
      return next(e);
    }
    // trying to access a market that is not your own
    if ((req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) &&
     data.marketId !== req.auth.marketId) {
      logger.debug({ message: `User marketId: ${req.auth.userId} denied access` });
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource.',
        status: 403
      }));
    }
    res.status(200).json(data);
    return next();
  });

module.exports = router;
