const express = require('express');
const { middlewares } = require('@spokedev/fab_utils');

const faqRouter = require('./routers/faqs');
const healthCheckRouter = require('./routers/healthcheck');

const app = express();

app.use(middlewares.parseRequest());
app.use(middlewares.trackingInit());
app.use(middlewares.requestInit());
app.use(middlewares.schemaValidator(`${__dirname}/../definitions/getting-started.yaml`));

app.use('/gettingstarted', healthCheckRouter);
app.use('/gettingstarted/faqs', faqRouter);

app.use(middlewares.defaultErrorHandler());
app.use(middlewares.logsClose());

module.exports = app;
