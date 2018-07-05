const Promise = require('bluebird');
const Ajv = require('ajv');
const path = require('path');
const _fs = require('fs');
const logger = require('../logger');
const { metrics } = require('../lib');

const ajv = new Ajv({ allErrors: true });
const fs = {
  readFile: Promise.promisify(_fs.readFile, { context: _fs }),
  readdir: Promise.promisify(_fs.readdir, { context: _fs })
};

class SchemaError {
  constructor(msg) {
    this.message = msg;
  }
}

class ValidationError extends SchemaError {
  constructor(errors = null) {
    super('ValidationError');
    this.errors = errors;
  }
}

class SchemaNotFoundError extends SchemaError {
  constructor(errors = null) {
    super('SchemaNotFoundError');
    this.errors = errors;
  }
}

class Schema {
  constructor(directory) {
    const dir = _fs.lstatSync(directory);
    if (dir.isDirectory() !== true) {
      throw new Error(`directory "${directory}" is not a valid path to a directory`);
    }
    this._dir = directory;
    this._ready = false;
    this._loaded = this.init();
  }

  static compareAndValidate(schemaObject, object) {
    const schema = ajv.compile(schemaObject);
    if (!schema) {
      logger.error({ message: `${schemaObject} could not be compiled` });
      metrics.increment('errors');
      return { err: new SchemaNotFoundError(), data: null };
    }
    if (schema(object) !== true) {
      logger.error({ message: `body validation failed for ${schemaObject} and ${object}` });
      metrics.increment('errors');
      return { err: new ValidationError(schema.errors), data: false };
    }
    return { err: null, data: true };
  }

  static isValidSchema({ schema }) {
    const validSchema = ajv.validateSchema(schema);
    if (!validSchema) {
      logger.error({ message: `Schema object is not valid: ${JSON.stringify(ajv.errors)}` });
      metrics.increment('errors');
      return { err: new SchemaError(ajv.errors), data: null };
    }
    return { err: null, data: validSchema };
  }

  async init() {
    const files = await fs.readdir(this._dir);
    const schemaFiles = files.filter(f => path.extname(f) === '.schema');
    return Promise.map(schemaFiles, async (f) => {
      const type = path.basename(f, '.schema');
      const schemaBuffer = await fs.readFile(path.join(this._dir, `${type}.schema`));
      const schemaString = schemaBuffer.toString();
      const schemaObj = JSON.parse(schemaString);
      return ajv.addSchema(schemaObj, type);
    }).then(() => {
      this._ready = true;
    }).catch((e) => {
      logger.error({ message: `ERROR LOADING SCHEMAS: ${e.message}` });
      metrics.increment('errors');
    });
  }

  async validate(type, body) {
    if (!this._ready) {
      await this._loaded;
    }
    const schema = ajv.getSchema(type);
    if (!schema) {
      logger.error({ message: `schema not found for type ${type}` });
      metrics.increment('errors');
      return { err: new SchemaNotFoundError(), data: null };
    }
    const valid = schema(body);
    if (valid !== true) {
      logger.error({ message: `body validation failed for ${type}` });
      metrics.increment('errors');
      return { err: new ValidationError(schema.errors), data: false };
    }
    return { err: null, data: true };
  }
}

module.exports = {
  Schema,
  SchemaError,
  ValidationError,
  SchemaNotFoundError
};
