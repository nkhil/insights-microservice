const express = require('express');
const logger = require('../logger');
const middlewares = require('../middlewares');
const clientsController = require('../controllers/clients');
const { BaseError, InternalError } = require('../errors');

const router = express.Router();

router.post('/',
  middlewares.schemaCheck('clients_post'),
  async (req, res, next) => {
    try {
      const client = await clientsController.create(req.body);
      // set response code/location/data
      res.status(201).location(`/clients/${client.id}`).json(client);
      return next();
    } catch (err) {
      if (err instanceof BaseError) {
        // debug as error captured at clients controller.
        logger.debug({ msg: 'Error From Clients Controller' });
        next(err);
      }
      // it's important to put the error/message into the object as err/msg here.
      // errors are logged when they occur
      logger.error({ err, msg: 'Unhandled Error From Clients Controller' });
      // if we reach this point we return internal error
      return next(new InternalError());
    }
  });

module.exports = router;
