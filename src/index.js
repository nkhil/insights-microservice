const express = require('express');
const bodyParser = require('body-parser');
const { schema, middlewares } = require('@spokedev/fab_utils');

const clientRouter = require('./routers/clients');
const healthCheckRouter = require('./routers/healthcheck');

schema.configure(`${__dirname}/schemas`);

const app = express();

app.use(bodyParser.json());
app.use(middlewares.trackingInit());
app.use(middlewares.requestInit());

app.use('/', healthCheckRouter);
app.use('/clients', clientRouter);

app.use(middlewares.defaultErrorHandler());
app.use(middlewares.logsClose());

module.exports = app;
