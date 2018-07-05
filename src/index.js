if (process.env.DD_TRACE_AGENT_HOSTNAME) {
  /* eslint-disable */
  const tracer = require('dd-trace').init();
  /* eslint-enable */
}

const express = require('express');
const config = require('./config');
const bodyParser = require('body-parser');
const middlewares = require('./middlewares');
const routers = require('./routers');
const partialResponse = require('express-partial-response');

const app = express();
app.use(partialResponse());

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

// app.use(middlewares.filterResponse());
// app.use(middlewares.authenticate()); // auth check on all routes

// controller router
app.use('/clients', routers.clients);

// post controller middleware
app.use(middlewares.defaultErrorHandler());
app.use(middlewares.logsClose());

module.exports = {
  run: () => app.listen(config.express.port),
  app
};
