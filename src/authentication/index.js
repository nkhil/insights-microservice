const Authentication = require('./authentication');
const { jwtGenerator } = require('./generators');

module.exports = {
  authentication: new Authentication({ generator: jwtGenerator })
};
