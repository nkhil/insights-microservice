const tracer = require('dd-trace');
const express = require('express');

const bodyParser = require('body-parser');
const middlewares = require('./middlewares');
const routers = require('./routers');

if (process.env.DD_TRACE_AGENT_HOSTNAME) {
  tracer.init();
}

const app = express();

// pre controller middleware
app.use(bodyParser.json());
app.use(middlewares.parseExceptionCatcher());

// error handling
app.use(middlewares.tracking());
app.use(middlewares.requestInit());

// the health check must be before authentication
app.get('/ping', async (req, res) => {
  res.status(200).end();
});

app.get('/ready', async (req, res) => {
  res.status(200).end();
});

// controller router
app.use('/clients', routers.clients);

// post controller middleware
app.use(middlewares.defaultErrorHandler());
app.use(middlewares.logsClose());

module.exports = app;
