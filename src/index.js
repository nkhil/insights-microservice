const express = require('express');
const bodyParser = require('body-parser');
const { schema, middlewares } = require('@spokedev/fab_utils');

const routers = require('./routers');

/* CONFIGURE SCHEMA + TRACE AGENT */
schema.configure(`${__dirname}/schemas`);

/* SET UP APP MIDDLEWARES */
const app = express();

app.use(bodyParser.json());
app.use(middlewares.trackingInit());
app.use(middlewares.requestInit());

app.get('/ping', async (_, res) => res.status(200).end());
app.get('/ready', async (_, res) => res.status(200).end());
app.use('/clients', routers.clients);

app.use(middlewares.defaultErrorHandler());
app.use(middlewares.logsClose());

module.exports = app;
