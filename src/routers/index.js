const markets = require('./markets');
const clients = require('./clients');
const providers = require('./providers');
const rfqs = require('./rfqs');
const quotes = require('./quotes');
const auth = require('./auth');
const dispatch = require('./dispatch');
const declines = require('./declines');

module.exports = {
  markets,
  clients,
  providers,
  rfqs,
  quotes,
  auth,
  dispatch,
  declines
};
