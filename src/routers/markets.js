const express = require('express');
const { marketsController } = require('../controllers');
const middlewares = require('../middlewares');
const logger = require('../logger');
const { roles } = require('../config');
const { SchemaError } = require('../schema');
const {
  InvalidParametersError,
  DuplicateError,
  ResourceNotFoundError,
  RESTError
} = require('../errors');

const router = express.Router();

router.post('/',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin] }),
  middlewares.schemaCheck('markets_post'),
  async (req, res, next) => {
    let err;
    let data;
    ({ err, data } = await marketsController.create({ name: req.body.name }));

    if (err) {
      logger.debug({ message: 'error from markets controller' });
      if (err instanceof DuplicateError) {
        err = new RESTError({ message: 'Conflict', description: 'Duplicate Market Name', status: 409 });
      }
      return next(err);
    }

    ({ err, data } = await marketsController.update({
      id: data.id,
      ...req.body
    }));

    if (err) {
      logger.debug({ message: 'FATAL! Partial failure! No rollback after update failed' });
      if (err instanceof InvalidParametersError) {
        err = new RESTError({ message: 'Bad Request', description: 'Invalid request body', status: 400 });
      }
      if (err instanceof SchemaError) {
        err = new RESTError({
          message: 'Bad Request',
          status: 400,
          description: 'Invalid schema object passed, see errors',
          errors: err.message
        });
      }
      return next(err);
    }

    res.status(201).location(`/markets/${data.id}`).json(data);
    return next();
  }
);

router.get('/',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin,
    roles.clientAdmin, roles.providerAdmin, roles.provider, roles.client] }),
  middlewares.setOffsetLimit(),
  async (req, res, next) => {
    let marketId;
    if (req.auth.userType !== roles.superAdmin && req.auth.userType !== roles.admin) {
      marketId = req.auth.marketId;
    }
    const { err, data } = await marketsController.list({
      offset: req.query.offset,
      limit: req.query.limit,
      marketId
    });

    if (err) {
      logger.debug({ message: 'error from markets controller' });
      let e = err;
      if (e instanceof InvalidParametersError) {
        e = new RESTError({ message: 'Bad Request', description: 'Invalid values for offset and/or limit', status: 400 });
      }
      return next(e);
    }

    res.status(200).json(data);
    return next();
  }
);

router.get('/:id',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin,
    roles.clientAdmin, roles.providerAdmin, roles.provider, roles.client] }),
  async (req, res, next) => {
    if (req.params.id !== req.auth.marketId && req.auth.userType !== roles.superAdmin &&
      req.auth.userType !== roles.admin) {
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
    const { err, data } = await marketsController.get({ id: req.params.id });

    if (err) {
      logger.debug({ message: 'error from markets controller' });
      let e = err;
      if (e instanceof InvalidParametersError) {
        e = new RESTError({ message: 'Bad Request', description: 'ID must be a uuid/v4', status: 400 });
      } else if (e instanceof ResourceNotFoundError) {
        e = new RESTError({ message: 'Resource Not Found', description: `Market with id: ${req.params.id} not found`, status: 404 });
      }
      return next(e);
    }

    res.status(200).json(data);
    return next();
  });

router.patch('/:id',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin] }),
  async (req, res, next) => {
    // trying to get market that is not your own
    if (req.params.id !== req.auth.marketId && req.auth.userType === roles.marketAdmin) {
      logger.debug({ message: `User marketId: ${req.auth.marketId} denied access` });
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource',
        status: 403
      }));
    }
    return next();
  },
  middlewares.schemaCheck('markets_patch'),
  async (req, res, next) => {
    const { err, data } = await marketsController.update({
      id: req.params.id,
      ...req.body
    });

    if (err) {
      logger.debug({ message: 'error from controller' });
      let e = err;
      if (e instanceof InvalidParametersError) {
        e = new RESTError({ message: 'Bad Request', description: 'Invalid parameters in body', status: 400 });
      } else if (e instanceof ResourceNotFoundError) {
        e = new RESTError({ message: 'Resource Not Found', description: `Market with id: ${req.params.id} not found`, status: 404 });
      }
      return next(e);
    }

    res.status(200).json(data);
    return next();
  }
);

router.delete('/:id',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin] }),
  async (req, res, next) => {
    if (req.params.id !== req.auth.marketId && req.auth.userType === roles.marketAdmin) {
      logger.debug({ message: `User marketId, ${req.auth.marketId} denied access` });
      return next(new RESTError({
        message: 'Forbidden',
        description: 'Access denied. You are not authorized to access this resource',
        status: 403
      }));
    }
    return next();
  },
  async (req, res, next) => {
    const { err } = await marketsController.delete({ id: req.params.id });
    if (err) {
      logger.debug({ message: 'error from markets controller' });
      let e = err;
      if (e instanceof InvalidParametersError) {
        e = new RESTError({ message: 'Bad Request', description: 'ID must be a uuid/v4', status: 400 });
      } else if (e instanceof ResourceNotFoundError) {
        e = new RESTError({ message: 'Resource Not Found', description: `Market with id: ${req.params.id} not found`, status: 404 });
      }
      return next(e);
    }

    res.status(204).end();
    return next();
  });

router.get('/:id/revisions',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin] }),
  middlewares.setOffsetLimit(),
  async (req, res, next) => {
    if (req.params.id !== req.auth.marketId && req.auth.userType === roles.marketAdmin) {
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
    const { err, data } = await marketsController.listRevisions({
      id: req.params.id,
      offset: req.query.offset,
      limit: req.query.limit
    });

    if (err) {
      logger.debug({ message: 'error from markets controller' });
      let e = err;
      if (e instanceof InvalidParametersError) {
        e = new RESTError({ message: 'Bad Request', description: 'Invalid values for id and/or offset and/or limit', status: 400 });
      }
      if (e instanceof ResourceNotFoundError) {
        e = new RESTError({ message: 'Resource Not Found', description: `Market with id: ${req.params.id} not found`, status: 404 });
      }
      return next(e);
    }

    res.status(200).json(data);
    return next();
  });

router.get('/:id/revisions/:revisionId',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin, roles.marketAdmin] }),
  async (req, res, next) => {
    if (req.params.id !== req.auth.marketId && req.auth.userType === roles.marketAdmin) {
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
    const { err, data } = await marketsController.getRevision({
      id: req.params.id,
      revisionId: req.params.revisionId
    });

    if (err) {
      logger.debug({ message: 'error from markets controller' });
      let e = err;
      if (e instanceof InvalidParametersError) {
        e = new RESTError({ message: 'Bad Request', description: 'Invalid values for id and/or revisionId', status: 400 });
      } else if (e instanceof ResourceNotFoundError) {
        e = new RESTError({ message: 'Resource Not Found', description: `Market/revision with id: ${req.params.id} / ${req.params.revisionId} not found`, status: 404 });
      }
      return next(e);
    }

    res.status(200).json(data);
    return next();
  });

module.exports = router;
