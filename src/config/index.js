module.exports = {
  express: {
    port: parseInt(process.env.EXPRESS_PORT, 10) || 3000
  },
  DAS: {
    url: process.env.DAS_URL || 'http://localhost:4001'
  },
  // defines the application environment
  environment: process.env.ENVIRONMENT,
  project: process.env.NAME || process.env.npm_package_name
};
