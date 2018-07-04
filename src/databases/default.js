const { ResourceNotFoundError } = require('../errors');
const ErrorChecker = require('./errchecker');
const logger = require('../logger');
const { toSnakeCase, metrics } = require('../lib');
/*
* Unlike Postgres, Cockroach implements optimistic concurrency locking.
* We have to explicitly check errors for queries which fail due to concurrent modification.
* All functions recurse on error code 40001 to account for this.
*/


class DefaultKnexDAO {
  constructor({ knexPool, table, transformer }) {
    this.knex = knexPool;
    this.table = table;
    this.toDatabase = transformer.toDatabase;
    this.fromDatabase = transformer.fromDatabase;
  }
  async create({ model }) {
    logger.invocation({ args: { model } });
    const timer = logger.startTimer();
    try {
      const dbModel = this.toDatabase(model);
      const result = await this.knex(this.table)
        .insert(dbModel).returning('*');
      timer.stop().info({ message: 'successful db.create' });
      return { err: null, data: this.fromDatabase(result[0]) };
    } catch (e) {
      timer.stop().error({ message: e.message });
      metrics.increment('errors');
      if (e.code === '40001') {
        return this.create({ model });
      }
      return { err: ErrorChecker.getDbError(e), data: null };
    }
  }

  async get({ id }) {
    logger.invocation({ args: { id } });
    const timer = logger.startTimer();
    try {
      const data = await this.knex(this.table)
        .select('*')
        .where({ id });

      if (data.length === 0) {
        timer.stop().error({ message: 'Resource Not Found' });
        metrics.increment('errors');
        return { err: new ResourceNotFoundError(), data: null };
      }
      timer.stop().info({ message: 'successful db.get' });
      return { err: null, data: this.fromDatabase(data[0]) };
    } catch (e) {
      timer.stop().error({ message: e.message });
      metrics.increment('errors');
      if (e.code === '40001') {
        return this.get({ id });
      }
      return { err: ErrorChecker.getDbError(e), data: null };
    }
  }

  async list({ offset, limit, filters = {} }) {
    logger.invocation({ args: { offset, limit, filters } });
    const timer = logger.startTimer();
    try {
      const models = await this.knex(this.table)
        .select('*')
        .modify((queryBuilder) => {
          // uses whereIn if key is an Array and where otherwise
          Object.entries(filters).forEach(([key, value]) => {
            if (value instanceof Array) {
              queryBuilder.whereIn(toSnakeCase(key), value);
            } else if (typeof value !== 'undefined') {
              queryBuilder.where(toSnakeCase(key), value);
            }
          });
          // only apply offset and limit if they have been provided
          if (offset) queryBuilder.offset(offset);
          if (limit) queryBuilder.limit(limit);
        })
        .orderBy('created_on', 'desc')
        .map(this.fromDatabase);

      timer.stop().info({ message: 'successful db.list' });
      return { err: null, data: models };
    } catch (e) {
      timer.stop().error({ message: e.message });
      if (e.code === '40001') {
        return this.list({ offset, limit, filters });
      }
      return { err: ErrorChecker.getDbError(e), data: null };
    }
  }

  async update({ id, keyValues }) {
    logger.invocation({ args: { id, keyValues } });
    const timer = logger.startTimer();
    try {
      const model = await this.knex(this.table)
        .update(this.toDatabase(keyValues), '*')
        .where({ id })
        .then((data) => {
          if (data.length === 0) {
            throw new ResourceNotFoundError();
          }
          return this.fromDatabase(data[0]);
        });
      timer.stop().info({ message: 'successful db.update' });
      return { err: null, data: model };
    } catch (e) {
      timer.stop().error({ message: e.message });
      metrics.increment('errors');
      if (e.code === '40001') {
        return this.update({ id, keyValues });
      }
      return { err: ErrorChecker.getDbError(e), data: null };
    }
  }

  async delete({ id }) {
    logger.invocation({ args: { id } });
    const timer = logger.startTimer();
    try {
      const deletedCount = await this.knex(this.table)
        .where({ id })
        .del();
      if (!deletedCount) {
        timer.stop().error({ message: 'Resource Not Found' });
        metrics.increment('errors');
        return { err: new ResourceNotFoundError(), data: null };
      }
      timer.stop().info({ message: 'successful db.delete' });
      return { err: null, data: null };
    } catch (e) {
      timer.stop().error({ message: e.message });
      metrics.increment('errors');
      if (e.code === '40001') {
        return this.delete({ id });
      }
      return { err: ErrorChecker.getDbError(e), data: null };
    }
  }
}

module.exports = {
  DefaultKnexDAO
};
