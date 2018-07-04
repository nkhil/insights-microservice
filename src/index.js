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
const db = require('./databases');
const partialResponse = require('express-partial-response');
const { metrics } = require('./lib');

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
  try {
    const data = await db.healthcheck();
    data.markets.forEach(market => metrics.gauge('markets', market.count));
    data.clients.forEach(client => metrics.gauge('clients', client.count, { marketId: client.market_id }));
    data.providers.forEach(provider => metrics.gauge('providers', provider.count, { marketId: provider.market_id }));
    res.status(200).end();
  } catch (e) {
    res.status(500).end();
  }
});

app.use(middlewares.filterResponse());
app.use(middlewares.authenticate()); // auth check on all routes

// controller router
app.use('/markets', routers.markets);
app.use('/clients', routers.clients);
app.use('/providers', routers.providers);
app.use('/rfqs', routers.rfqs);
app.use('/quotes', routers.quotes);
app.use('/declines', routers.declines);
app.use('/auth', routers.auth);
app.use('/dispatch', routers.dispatch);

// post controller middleware
app.use(middlewares.defaultErrorHandler());
app.use(middlewares.logsClose());

module.exports = {
  run: () => app.listen(config.express.port),
  app
};
