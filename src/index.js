const express = require('express');
const middlewares = require('../middlewares');
const transactionsRouter = require('./routers/transactions');
const healthCheckRouter = require('./routers/healthcheck');

const app = express();

app.use(middlewares.parseRequest());

app.use('/healthcheck', healthCheckRouter);
app.use('/transactions', transactionsRouter);

module.exports = app;
