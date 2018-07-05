const config = require('./src/config');
const app = require('./src');

app.listen(config.express.port);
