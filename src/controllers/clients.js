const logger = require('../logger');
const { metrics } = require('../lib');

async function create(client) {
  const error = null;
  const data = { id: 1 };
  logger.debug(`create client ${client}`);
  metrics.increment('clients');
  // try {
  //   const raw = await db('test_table').select('*');
  //   data = raw.map(r => ({
  //     id: r.id,
  //     name: r.name
  //   }));
  // } catch (e) {
  //   logger.error(e);
  //   error = e.message;
  //   metrics.increment('errors');
  // }
  return { error, data };
}

async function get(id) {
  const error = null;
  const data = { name: 'sample' };
  logger.debug(`get client ${id}`);
  // try {
  //   const raw = await db('test_table').select('*');
  //   data = raw.map(r => ({
  //     id: r.id,
  //     name: r.name
  //   }));
  // } catch (e) {
  //   logger.error(e);
  //   error = e.message;
  //   metrics.increment('errors');
  // }
  return { error, data };
}

module.exports = {
  create,
  get
};
