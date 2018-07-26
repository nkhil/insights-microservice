const { gracefulShutdown } = require('@spokedev/fab_utils');
const config = require('./src/config');
const app = require('./src');

const server = app.listen(config.express.port);
gracefulShutdown(server);
