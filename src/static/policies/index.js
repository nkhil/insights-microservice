const superAdmin = require('./superAdmin.json');
const admin = require('./admin.json');
const marketAdmin = require('./marketAdmin.json');
const clientAdmin = require('./clientAdmin.json');
const providerAdmin = require('./providerAdmin.json');
const client = require('./client.json');
const provider = require('./provider.json');

const policies = { superAdmin, admin, marketAdmin, clientAdmin, providerAdmin, client, provider };

const find = ({ user, route, method }) => {
  try {
    let policy = policies[user][route][method];
    if (!policy) {
      policy = 'thisFieldNameIsARandomStringToEnsureAllDataIsObfuscatedIfNoPolicyIsProvided';
    }
    return { err: null, data: policy };
  } catch (err) {
    return { err: null, data: 'thisFieldNameIsARandomStringToEnsureAllDataIsObfuscatedIfNoPolicyIsProvided' };
  }
};

module.exports = {
  find
};
