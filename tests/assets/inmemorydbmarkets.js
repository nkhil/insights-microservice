const { ConnectionError } = require('../../src/errors');
const { Market } = require('../../src/models');
const { InMemoryDB } = require('./inmemorydb');

class InMemoryMarketDB extends InMemoryDB {
  constructor() {
    super();
    this.revisions = {};
  }

  async create({ model }) {
    this.revisions[model.id] = [];
    let market = new Market();
    market = Object.assign(market, model);
    this.revisions[model.id].push(market);
    return super.create({ model });
  }

  async update({ id, keyValues }) {
    const { data } = await super.get({ id });
    let market = new Market();
    market = Object.assign(data, keyValues);
    market.id = id;
    const { err } = await super.update({ id: market.id, keyValues: market });
    if (err) return { err: new ConnectionError('db.update unknown error'), data: null };
    this.revisions[market.id].push(market);
    return { err: null, data: market };
  }

  async delete({ id }) {
    const { data } = await super.get({ model: id });
    let market = new Market();
    market = Object.assign({}, data, { active: false });
    market.id = id;
    const { err } = await super.update({ id: market.id, keyValues: market });
    if (err) return { err: new ConnectionError('db.update unknown error'), data: null };
    this.revisions[market.id].push(market);
    return { err: null, data: true };
  }

  async listRevisions({ id }) {
    if (this.error) return { err: new ConnectionError('db.listRevisions unknown error'), data: null };

    const data = this.revisions[id];
    return { err: null, data };
  }

  async getRevision({ id }) {
    if (this.error) return { err: new ConnectionError('db.delete unknown error'), data: null };

    const market = this.revisions[id][0];
    return { err: null, data: market };
  }
}

module.exports = {
  InMemoryMarketDB
};
