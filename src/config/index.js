module.exports = {
  express: {
    port: parseInt(process.env.EXPRESS_PORT, 10) || 3000
  },
  DAS: {
    url: process.env.DAS_URL || 'http://localhost:4001'
  },
  // defines the application environment
  environment: process.env.ENVIRONMENT || 'local',
  logging: {
    // defines the details for the logger
    level: process.env.LOG_LEVEL || 'info'
  },
  metrics: {
    // defines the metric agent hostname
    dogStatsHost: process.env.DOGSTATS_HOST || 'localhost',
    traceAgentHost: process.env.DD_TRACE_AGENT_HOSTNAME
  },
  bcrypt: {
    saltrounds: process.env.BCRYPT_SALT_ROUNDS || 10
  }
};
