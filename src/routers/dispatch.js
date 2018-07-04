const express = require('express');
const logger = require('../logger');
const middlewares = require('../middlewares');
const { roles } = require('../config');
const { dispatchController } = require('../controllers');

const router = express.Router();

router.post('/',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin, roles.admin] }),
  middlewares.schemaCheck('dispatch_post'),
  async (req, res, next) => {
    const { err } = await dispatchController.retryForTarget({ targetId: req.body.targetId });
    if (err) {
      logger.debug({ message: 'error from Dispatch Controller' });
      return next(err);
    }
    res.status(200);
    return next();
  });

module.exports = router;
