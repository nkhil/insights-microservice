const express = require('express');
const logger = require('../logger');
const middlewares = require('../middlewares');
const { roles } = require('../config');
const { authController } = require('../controllers');

const router = express.Router();

router.post('/',
  middlewares.checkAccess({ accessRoles: [roles.superAdmin] }),
  middlewares.schemaCheck('auth_post'),
  async (req, res, next) => {
    const { err, data } = await authController.create({
      userType: req.body.userType,
      userId: req.body.userId,
      marketId: req.body.marketId
    });

    if (err) {
      logger.debug({ message: 'error from Auth Controller' });
      return next(err);
    }

    res.status(200).json({ token: data });
    return next();
  });

module.exports = router;
