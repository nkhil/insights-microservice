const bcrypt = require('bcrypt');
const config = require('../config');

async function hash(string) {
  return bcrypt.hash(string, config.bcrypt.saltrounds);
}

async function compare(string, hashValue) {
  return bcrypt.compare(string, hashValue);
}

module.exports = {
  hash,
  compare
};
