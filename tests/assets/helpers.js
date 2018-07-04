const faker = require('faker');
const Promise = require('bluebird');
const app = require('../../src').app;
const request = require('supertest');
const chai = require('chai');
const knexPool = require('../../src/databases/').knexPool;

chai.should();

const tokenStub = 123;

class Helpers {
  static authStub({ userType, userId, marketId }) {
    return ({
      err: null,
      data: {
        permissions: { userType, userId, marketId }
      }
    });
  }

  static makeClient({ name = faker.name.findName(), webhookUrl = 'http://localhost:6666', marketId }) {
    return request(app)
      .post('/clients')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${tokenStub}`)
      .send({
        name,
        description: 'desc',
        marketId,
        webhookUrl,
        webhookHeaders: { Authorization: '123' }
      })
      .expect(201)
      .then(res => res.body);
  }

  static makeMarket({
    name = faker.name.findName(),
    rfqSchema = {},
    isActive = true,
    quoteSchema = {},
    acceptanceSchema = {},
    completionSchema = {} }) {
    return request(app)
      .post('/markets')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${tokenStub}`)
      .send({ name, rfqSchema, isActive, quoteSchema, acceptanceSchema, completionSchema })
      .expect(201)
      .then(res => res.body);
  }

  static makeProvider({
    name = faker.name.findName(),
    webhookUrl = 'http://localhost:6666',
    filterSchema = {},
    locations = [],
    marketId
  }) {
    const payload = {
      name,
      description: 'desc',
      marketId,
      webhookUrl,
      webhookHeaders: { Authorization: '123' },
      filterSchema,
      locations
    };

    return request(app)
      .post('/providers')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${tokenStub}`)
      .send(payload)
      .expect(201)
      .then(res => res.body);
  }

  static assertErrorFormat(response) {
    response.body.should.have.property('message');
    response.body.should.have.property('description');
    response.headers.should.have.property('x-request-id');
  }

  static async clearDatabase() {
    return Promise.all([
      Promise.each([
        () => knexPool('clients').del(),
        () => knexPool('client_revisions').del()
      ], x => x()),
      Promise.each([
        () => knexPool('providers').del(),
        () => knexPool('provider_revisions').del()
      ], x => x()),
      Promise.each([
        () => knexPool('markets').del(),
        () => knexPool('market_revisions').del()
      ], x => x()),
      Promise.each([
        () => knexPool('quotes').del(),
        () => knexPool('quote_revisions').del()
      ], x => x()),
      knexPool('rfqs').del(),
      knexPool('dispatch_requests').del(),
      knexPool('declines').del()
    ]);
  }
}

module.exports = { Helpers };
