const express = require('express');
const middlewares = require('../middlewares');
const transactionsRouter = require('./routers/transactions');
const healthCheckRouter = require('./routers/healthcheck');

const app = express();

app.use(middlewares.parseRequest());

app.use('/insights/healthcheck', healthCheckRouter);
app.use('/insights/transactions', transactionsRouter);

module.exports = app;
