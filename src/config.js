module.exports = {
  express: {
    port: parseInt(process.env.EXPRESS_PORT, 10) || 3000
  },
  transactions: {
    url: process.env.TRANSACTIONS_URL || 'http://localhost:4000/transactions'
  },
  // defines the application environment
  environment: process.env.ENVIRONMENT,
  project: process.env.NAME || process.env.npm_package_name
};
