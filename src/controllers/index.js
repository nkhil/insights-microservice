const db = require('../databases');
const { authentication } = require('../authentication');
const { ClientsController } = require('./clients');
const { ProvidersController } = require('./providers');
const { DispatchController } = require('./dispatch');
const { MarketsController } = require('./markets');
const { RfqsController } = require('./rfqs');
const { AuthController } = require('./auth');
const { QuotesController } = require('./quotes');
const { DeclinesController } = require('./declines');

module.exports = {
  clientsController: new ClientsController(db.client),
  marketsController: new MarketsController(db.market),
  providersController: new ProvidersController(db.provider),
  dispatchController: new DispatchController(db.dispatch),
  rfqsController: new RfqsController(db.rfq),
  quotesController: new QuotesController(db.quote),
  authController: new AuthController(authentication),
  declinesController: new DeclinesController(db.declines)
};
