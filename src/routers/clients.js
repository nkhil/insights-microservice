const express = require('express');
const logger = require('../logger');
const { clientsController } = require('../controllers');
const {
  DuplicateError,
  InvalidParametersError,
  ResourceNotFoundError,
  RESTError
} = require('../errors');

const router = express.Router();

router.post('/',
  async (req, res, next) => {
    const { err, data } = await clientsController.create(req.body);
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
    res.status(201).location(`/clients/${data.id}`).json(data);
    return next();
  });

router.get('/:id',
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
    res.status(200).json(data);
    return next();
  });

module.exports = router;
