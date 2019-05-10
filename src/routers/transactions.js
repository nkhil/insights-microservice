const express = require('express');
const controllers = require('../controllers');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const transactions = await controllers.transactions.list();
    res.status(200).json(transactions);
    return next();
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message });
    return next();
  }
});

module.exports = router;
