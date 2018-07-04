const { toSnakeCase, metrics } = require('../lib');
const { ResourceNotFoundError } = require('../errors');
const errChecker = require('./errchecker');
const logger = require('../logger');

/*
* Unlike Postgres, Cockroach implements optimistic concurrency locking.
* We have to explicitly check errors for queries which fail due to concurrent modification.
* All functions recurse on error code 40001 to account for this.
*/
class RevisionsKnexDAO {
  constructor({ knexPool, mainTable, revisionsTable, revisionKey, transformer }) {
    this.knex = knexPool;
    this.mainTable = mainTable;
    this.revisionsTable = revisionsTable;
    this.revisionKey = revisionKey;
    this.toDatabase = transformer.toDatabase;
    this.fromDatabase = transformer.fromDatabase;
  }

  async create({ model }) {
    logger.invocation({ args: { model } });
    const data = this.toDatabase(model);
    const timer = logger.startTimer();
    try {
      const result = await this.knex.transaction(async (trx) => {
        const revision = await trx.insert(data.revision).into(this.revisionsTable).returning('*');
        const main = await trx.insert(data.main).into(this.mainTable).returning('*');
        return Object.assign(revision[0], main[0]);
      });
      timer.stop().info({ message: `${this.mainTable}: successful db.create` });
      return { err: null, data: this.fromDatabase(result) };
    } catch (e) {
      timer.stop().error({ message: e.message });
      metrics.increment('errors');
      if (e.code === '40001') {
        return this.create({ model });
      }
      return { err: errChecker.getDbError(e), data: null };
    }
  }

  async get({ id }) {
    logger.invocation({ args: { id } });
    const timer = logger.startTimer();
    try {
      const data = await this.knex
        .select('*')
        .from(this.revisionsTable)
        .innerJoin(this.mainTable, `${this.revisionsTable}.id`, `${this.mainTable}.revision_id`)
        .where(`${this.revisionsTable}.${this.revisionKey}`, id);
      if (data.length <= 0) {
        timer.stop().error({ message: `Resource with id ${id} not found` });
        metrics.increment('errors');
        return { err: new ResourceNotFoundError(), data: null };
      }
      timer.stop().info({ message: `${this.mainTable}: successful db.get` });
      const model = this.fromDatabase(data[0]);
      return { err: null, data: model };
    } catch (e) {
      timer.stop().error({ message: e.message });
      metrics.increment('errors');
      if (e.code === '40001') {
        return this.get({ id });
      }
      return { err: errChecker.getDbError(e), data: null };
    }
  }

  async list({ offset, limit, filters = {} }) {
    logger.invocation({ args: { filters } });
    const timer = logger.startTimer();
    try {
      const models = await this.knex
        .select('*')
        .from(this.revisionsTable)
        .innerJoin(this.mainTable, `${this.revisionsTable}.id`, `${this.mainTable}.revision_id`)
        .modify((queryBuilder) => {
          // uses whereIn if key is an Array and where otherwise
          Object.entries(filters).forEach(([key, value]) => {
            let columnName = key;
            if (key === 'id') {
              columnName = `${this.mainTable}.id`;
            }
            if (value instanceof Array) {
              queryBuilder.whereIn(toSnakeCase(columnName), value);
            } else if (typeof value !== 'undefined') {
              queryBuilder.where(toSnakeCase(columnName), value);
            }
          });
          // only apply offset and limit if they have been provided
          if (offset) queryBuilder.offset(offset);
          if (limit) queryBuilder.limit(limit);
        })
        .orderBy('updated_on', 'desc')
        .map(this.fromDatabase);

      timer.stop().info({ message: `${this.revisionsTable}: successful db.list` });
      return { err: null, data: models };
    } catch (e) {
      timer.stop().error({ message: e.message });
      metrics.increment('errors');
      if (e.code === '40001') {
        return this.list({ offset, limit, filters });
      }
      return { err: errChecker.getDbError(e), data: null };
    }
  }

  async update({ id, model }) {
    logger.invocation({ args: { id, model } });
    const data = this.toDatabase(model);
    const timer = logger.startTimer();
    try {
      const result = await this.knex.transaction(async (trx) => {
        const revision = await trx.insert(data.revision).into(this.revisionsTable).returning('*');
        const mainData = await trx.update({ revision_id: model.revisionId }, '*')
          .where({ id: model.id })
          .into(this.mainTable);
        if (mainData.length <= 0) {
          timer.stop().error({ message: `model with id ${id} not found` });
          metrics.increment('errors');
          throw new ResourceNotFoundError();
        }
        return Object.assign(revision[0], mainData[0]);
      });
      timer.stop().info({ message: `${this.mainTable}: successful db.update` });
      return { err: null, data: this.fromDatabase(result) };
    } catch (e) {
      timer.stop().error({ message: e.message });
      metrics.increment('errors');
      if (e.code === '40001') {
        return this.update({ id, model });
      }
      return { err: errChecker.getDbError(e), data: null };
    }
  }
  async delete({ id }) {
    logger.invocation({ args: { id } });
    const timer = logger.startTimer();
    try {
      await this.knex.transaction(async (trx) => {
        const clientDeleteCount = await trx(this.mainTable).where('id', id).del();
        if (clientDeleteCount <= 0) throw new ResourceNotFoundError();
        const revisionDeleteCount = await trx(this.revisionsTable)
          .where(this.revisionKey, id)
          .del();
        if (revisionDeleteCount <= 0) throw new ResourceNotFoundError();
      });
      timer.stop().info({ message: `${this.mainTable}: successful db.delete` });
      return { err: null, data: true };
    } catch (e) {
      timer.stop().error({ message: e.message });
      metrics.increment('errors');
      if (e.code === '40001') {
        return this.delete({ id });
      }
      return { err: errChecker.getDbError(e), data: null };
    }
  }

  async getRevision({ id, revisionId }) {
    logger.invocation({ args: { id, revisionId } });
    const timer = logger.startTimer();
    try {
      const models = await this.knex
        .select('*')
        .from(this.mainTable)
        .innerJoin(this.revisionsTable, `${this.revisionsTable}.${this.revisionKey}`, `${this.mainTable}.id`)
        .where({ [`${this.revisionsTable}.id`]: revisionId, [`${this.mainTable}.id`]: id });

      if (models.length <= 0) {
        timer.stop().error({ message: `revision with id ${revisionId} not found` });
        metrics.increment('errors');
        throw new ResourceNotFoundError();
      }
      // have to rename field to fix join;
      const result = models[0];
      result.revision_id = result.id;
      result.id = result[this.revisionKey];
      result.created_on = result.updated_on;
      delete result.updated_on;
      timer.stop().info({ message: `${this.mainTable}: successful db.getRevision` });
      return { err: null, data: this.fromDatabase(result) };
    } catch (e) {
      timer.stop().error({ message: e.message });
      metrics.increment('errors');
      if (e.code === '40001') {
        return this.getRevision({ id, revisionId });
      }
      return { err: errChecker.getDbError(e), data: null };
    }
  }

  async listRevisions({ id, offset, limit }) {
    logger.invocation({ args: { id, offset, limit } });
    const timer = logger.startTimer();
    try {
      const models = await this.knex
        .select('*')
        .from(this.mainTable)
        .innerJoin(this.revisionsTable, `${this.revisionsTable}.${this.revisionKey}`, `${this.mainTable}.id`)
        .where({ [`${this.mainTable}.id`]: id })
        .offset(offset)
        .limit(limit)
        .orderBy('updated_on', 'desc');

      // have to rename field to fix join;
      const data = models.map((row) => {
        const result = row;
        result.revision_id = result.id;
        result.id = result[this.revisionKey];
        return result;
      }).map(this.fromDatabase);

      if (data.length <= 0) {
        timer.stop().error({ message: `Resource with id ${id} not found` });
        metrics.increment('errors');
        return { err: new ResourceNotFoundError(), data: null };
      }

      timer.stop().info({ message: `${this.mainTable}: successful db.listRevisions` });
      return { err: null, data };
    } catch (e) {
      timer.stop().error({ message: e.message });
      metrics.increment('errors');
      if (e.code === '40001') {
        return this.listRevisions({ id, offset, limit });
      }
      return { err: errChecker.getDbError(e), data: null };
    }
  }
}

module.exports = {
  RevisionsKnexDAO
};
