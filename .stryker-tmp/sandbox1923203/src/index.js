const tracer = require('dd-trace');
const express = require('express');
const bodyParser = require('body-parser');
const {
  tracking,
  requestInit,
  logsClose
} = require('@spokedev/fab_logger');

const config = require('./config');
const middlewares = require('./middlewares');
const routers = require('./routers');

if (config.traceAgentHost) {
  tracer.init();
}

const app = express();

// pre controller middleware
app.use(bodyParser.json());
app.use(middlewares.parseExceptionCatcher());

// error handling
app.use(tracking());
app.use(requestInit());

// the health check must be before authentication
app.get('/ping', async (_, res) => res.status(200).end());
app.get('/ready', async (_, res) => res.status(200).end());

// controller router
app.use('/clients', routers.clients);

// post controller middleware
app.use(middlewares.defaultErrorHandler());
app.use(logsClose());

module.exports = app;
