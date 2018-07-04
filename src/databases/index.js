const knex = require('knex');
const config = require('../config');
const { MarketDB, MarketTransformer } = require('./market');
const { ClientDB, ClientTransformer } = require('./client');
const { ProviderDB, ProviderTransformer } = require('./provider');
const { RfqDB, RfqTransformer } = require('./rfq');
const { DispatchDB, DispatchTransformer } = require('./dispatch');
const { QuoteTransformer, QuoteDB } = require('./quote');
const { DeclineTransformer, DeclineDB } = require('./decline');

const { types } = require('pg');
// fixes issue with integers being returned as strings
types.setTypeParser(20, val => parseInt(val, 10));

const knexPool = knex({
  client: 'pg',
  version: '0.0',
  connection: {
    user: config.database.user,
    password: config.database.password,
    host: config.database.host,
    database: config.database.name,
    port: config.database.port
  },
  pool: config.database.pool_size,
  acquireConnectionTimeout: config.database.acquire_connection_timeout
});

const market = new MarketDB({
  knexPool,
  mainTable: 'markets',
  revisionsTable: 'market_revisions',
  revisionKey: 'market_id',
  transformer: MarketTransformer
});

const client = new ClientDB({
  knexPool,
  mainTable: 'clients',
  revisionsTable: 'client_revisions',
  revisionKey: 'client_id',
  transformer: ClientTransformer
});

const provider = new ProviderDB({
  knexPool,
  mainTable: 'providers',
  revisionsTable: 'provider_revisions',
  revisionKey: 'provider_id',
  transformer: ProviderTransformer
});

const rfq = new RfqDB({
  knexPool,
  table: 'rfqs',
  transformer: RfqTransformer
});

const dispatch = new DispatchDB({
  knexPool,
  table: 'dispatch_requests',
  transformer: DispatchTransformer
});

const quote = new QuoteDB({
  knexPool,
  mainTable: 'quotes',
  revisionsTable: 'quote_revisions',
  revisionKey: 'quote_id',
  transformer: QuoteTransformer
});


const declines = new DeclineDB({
  knexPool,
  table: 'declines',
  transformer: DeclineTransformer
});

async function healthcheck() {
  return {
    markets: await knexPool('markets').count('id'),
    clients: await knexPool('clients').distinct('market_id').count('id').groupBy('market_id'),
    providers: await knexPool('providers').distinct('market_id').count('id').groupBy('market_id')
  };
}

module.exports = {
  market,
  client,
  provider,
  rfq,
  quote,
  dispatch,
  declines,
  knexPool,
  healthcheck
};
