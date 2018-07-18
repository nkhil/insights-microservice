module.exports = {
  express: {
    port: parseInt(process.env.EXPRESS_PORT, 10) || 3000
  },
  DAS: {
    // url: process.env.DAS_URL || 'https://api.us.apiconnect.ibmcloud.com/dingersjigsawxyz-fab-dev/dasg/api',
    url: process.env.DAS_URL || 'http://localhost:4000',
    clientId: process.env.DAS_CLIENT_ID || '436cbb50-0a1e-4502-97c9-7f45bd932e84',
    clientSecret: process.env.DAS_CLIENT_SECRET || 'D3dE0kF7lY5qR3vS2hM1eN2rP7gP7kG4wJ6jR2pA1tQ8bM8pA6'
  },
  // defines the application environment
  environment: process.env.ENVIRONMENT,
  project: process.env.NAME || process.env.npm_package_name
};
