const logger = require('../logger');
const config = require('../config');
const StatsD = require('hot-shots');

const metrics = new StatsD({
  host: config.metrics.dogStatsHost,
  prefix: 'getting_started_',
  suffix: '_total',
  globalTags: { env: config.environment }
});

// Catch socket errors so they don't go unhandled
metrics.socket.on('error', (error) => {
  logger.error({ message: 'Error in Datadog socket', error });
});

module.exports = metrics;
