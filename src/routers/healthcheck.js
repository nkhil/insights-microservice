const express = require('express');

const router = express.Router();

router.get('/ping', async (_, res, next) => {
  res.status(200).end();
  next();
});

module.exports = router;
