const config = require('./src/config');
const app = require('./src/index');

app.listen(config.express.port);
