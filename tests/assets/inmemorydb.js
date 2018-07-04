const { DatabaseError } = require('../../src/errors');

class InMemoryDB {
  constructor() {
    this.models = {};
    this.error = false;
  }

  toggleError() {
    this.error = !this.error;
  }

  clean() {
    this.models = {};
    this.error = false;
  }

  async create({ model }) {
    if (this.error) {
      return { err: new DatabaseError('db.create unknown error'), data: null };
    }
    this.models[model.id] = model;
    return { err: null, data: model };
  }

  async get({ id }) {
    if (this.error) {
      return { err: new DatabaseError('db.get unknown error'), data: null };
    }
    if (this.models[id] !== undefined) {
      return { err: null, data: this.models[id] };
    }
    return { err: new DatabaseError('db.get unknown error'), data: null };
  }

  async list({ offset, limit }) {
    if (this.error) {
      return { err: new DatabaseError('db.list unknown error'), data: null };
    }
    let data = Object.values(this.models);
    if (typeof offset !== 'undefined' && typeof limit !== 'undefined') {
      data = data.splice(offset, limit);
    }
    return { err: null, data };
  }

  async update({ id, keyValues }) {
    if (this.error) {
      return { err: new DatabaseError('db.update unknown error'), data: null };
    }
    this.models[id] = Object.assign(this.models[id], keyValues);
    return { err: null, data: this.models[id] };
  }

  async delete({ id }) {
    if (this.error) {
      return { err: new DatabaseError('db.delete unknown error'), data: null };
    }
    delete this.models[id];
    return { err: null, data: null };
  }
}

module.exports = {
  InMemoryDB
};
