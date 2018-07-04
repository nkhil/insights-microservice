const chai = require('chai');
const faker = require('faker');
const request = require('supertest');
const sinon = require('sinon');
const Promise = require('bluebird');
const uuid = require('uuid/v4');
const app = require('../../src').app;
const { roles } = require('../../src/config');
const { authentication } = require('../../src/authentication');
const { tokenGenerator, Helpers } = require('../assets');

const {
  authStub,
  assertErrorFormat,
  makeMarket,
  makeProvider,
  clearDatabase
} = Helpers;

chai.should();

/* eslint-disable */
process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise ', p, ' reason: ', reason);
  process.exit(1);
});
/* eslint-enable */

describe('/providers', () => {
  beforeEach(async () => {
    this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
      userType: roles.superAdmin,
      userId: uuid(),
      marketId: uuid()
    }));

    this.tokenStub = 123;

    await clearDatabase();
    this.market = await makeMarket({});
    this.secondMarket = await makeMarket({});
    this.provider = await makeProvider({ marketId: this.market.id });
    this.createValidPayload = ({ marketId }) => ({
      name: faker.name.findName(),
      marketId: marketId || this.market.id,
      description: 'desc',
      webhookUrl: 'http://localhost:6666',
      webhookHeaders: { Authorization: '123' },
      filterSchema: { name: '123' },
      imageUrl: 'http://imageurl.com',
      locations: []
    });
    this.createBespokePayload = ({
      name,
      marketId,
      description,
      webhookUrl,
      webhookHeaders,
      filterSchema,
      iamgeUrl,
      locations
    }) => ({
      name: name || faker.name.findName(),
      marketId: marketId || this.market.id,
      description: description || 'description',
      webhookUrl: webhookUrl || 'http://localhost:6666',
      webhookHeaders: webhookHeaders || { Authorization: '123' },
      filterSchema: filterSchema || { name: '123' },
      imageUrl: iamgeUrl || 'http://imageurl.com',
      locations: locations || []
    });
  });

  afterEach(() => {
    this.authStub.restore();
  });

  describe('POST /providers', () => {
    context('success', () => {
      it('201: should return resource', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createValidPayload({}))
          .expect(201)
          .then((res) => {
            res.body.should.have.property('id');
            res.body.should.have.property('token');
            res.body.should.have.property('createdOn');
            res.body.should.have.property('updatedOn');
            res.body.marketId.should.equal(this.market.id);
            res.body.should.have.property('imageUrl');
            res.headers.should.have.property('x-request-id');
            res.headers.should.have.property('location');
            res.headers.location.should.equal(`/providers/${res.body.id}`);
          }));

      it('201: name should ony be unique in a single market', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload(
            { name: this.market.name, marketId: this.secondMarket.id })
          )
          .expect(201)
          .then(res => res.body.should.have.property('id'))
      );
      it('201: should return resource when creating provider with only name and market Id', () => {
        const payload = {
          name: faker.name.findName(),
          marketId: this.market.id
        };
        return request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(payload)
          .expect(201)
          .then((res) => {
            res.body.should.have.property('id');
            res.body.should.have.property('token');
            res.body.should.have.property('createdOn');
            res.body.should.have.property('updatedOn');
            res.body.marketId.should.equal(payload.marketId);
            res.body.should.have.property('imageUrl');
            res.headers.should.have.property('x-request-id');
            res.headers.should.have.property('location');
            res.headers.location.should.equal(`/providers/${res.body.id}`);
          });
      });
      it('201: should return resource when creating provider with a valid location', () => {
        const payload = this.createBespokePayload({ locations: [{ name: 'Main Office', lat: 50, long: 50 }] });
        return request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(payload)
          .expect(201)
          .then((res) => {
            res.body.should.have.property('id');
            res.body.should.have.property('token');
            res.body.should.have.property('createdOn');
            res.body.should.have.property('updatedOn');
            res.body.locations.should.eql(payload.locations);
            res.body.should.have.property('imageUrl');
            res.headers.should.have.property('x-request-id');
            res.headers.should.have.property('location');
            res.headers.location.should.equal(`/providers/${res.body.id}`);
          });
      });
      it('201: can create client with genuine token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.providerAdmin,
          marketId: this.market.id
        });
        return request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .send(this.createValidPayload({}))
          .expect(201)
          .then((res) => {
            res.body.should.have.property('id');
            res.body.should.have.property('token');
            res.body.should.have.property('createdOn');
            res.body.should.have.property('updatedOn');
            res.body.marketId.should.equal(this.market.id);
            res.body.should.have.property('imageUrl');
            res.headers.should.have.property('x-request-id');
            res.headers.should.have.property('location');
            res.headers.location.should.equal(`/providers/${res.body.id}`);
          });
      });
    });
    context('error', () => {
      it('400: payload properties don\'t match the schema', () => {
        const payload = {
          extraProperty: 1,
          marketId: this.market.id,
          description: 'desc',
          webhookUrl: 'http://localhost:6666',
          webhookHeaders: { Authorization: '123' }
        };
        return request(app)
          .post('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(payload)
          .then(assertErrorFormat);
      });
      it('400: name is an integer', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ name: 1 }))
          .expect(400)
          .then(assertErrorFormat));
      it('400: name is an empty string', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(Object.assign({}, this.createValidPayload({}), { name: '' }))
          .expect(400)
          .then(assertErrorFormat));
      it('400: name is null', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(Object.assign({}, this.createValidPayload({}), { name: null }))
          .expect(400)
          .then(assertErrorFormat));
      it('400: name is not in valid format', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.postToken}`)
          .send(this.createBespokePayload({ name: '<html>' }))
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: description is an integer', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ description: 1 }))
          .expect(400)
          .then(assertErrorFormat));
      it('400: description is an empty string', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(Object.assign({}, this.createValidPayload({}), { description: '' }))
          .expect(400)
          .then(assertErrorFormat));
      it('400: description is an empty string', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.postToken}`)
          .send(this.createBespokePayload({ description: '<html>' }))
          .expect(400)
          .then(assertErrorFormat));
      it('400: marketId is null', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(Object.assign({}, this.createValidPayload({}), { marketId: null }))
          .expect(400)
          .then(assertErrorFormat));
      it('400: marketId is not uuid', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ marketId: 1234 }))
          .expect(400)
          .then(assertErrorFormat));
      it('400: webhookUrl is not string', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ webhookUrl: 1234 }))
          .expect(400)
          .then(assertErrorFormat));
      it('400: webhookUrl is null', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(Object.assign({}, this.createValidPayload({}), { webhookUrl: null }))
          .expect(400)
          .then(assertErrorFormat));
      it('400: webhookHeaders is not object', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ webhookHeaders: 1234 }))
          .expect(400)
          .then(assertErrorFormat));
      it('400: webhookHeaders is null', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(Object.assign({}, this.createValidPayload({}), { webhookHeaders: null }))
          .expect(400)
          .then(assertErrorFormat));
      it('400: imageUrl is not a string', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(Object.assign({}, this.createValidPayload({}), { imageUrl: 1 }))
          .expect(400)
          .then(assertErrorFormat));
      it('400: locations is not an array', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ locations: 1234 }))
          .expect(400)
          .then(assertErrorFormat));
      it('400: locations is not an array of objects', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ locations: [1234] }))
          .expect(400)
          .then(assertErrorFormat));
      it('400: locations is not an array of objects with correct properties', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ locations: [{ location: 'office', latitude: 55, longitude: 55 }] }))
          .expect(400)
          .then(assertErrorFormat));
      it('400: lat property exceeds minimum value', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ locations: [{ name: 'office', lat: -91, long: 50 }] }))
          .expect(400)
          .then(assertErrorFormat));
      it('400: long property exceeds minimum value', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ locations: [{ name: 'office', lat: 50, long: -181 }] }))
          .expect(400)
          .then(assertErrorFormat));
      it('400: lat property exceeds maximum value', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ locations: [{ name: 'office', lat: 91, long: 50 }] }))
          .expect(400)
          .then(assertErrorFormat));
      it('400: long property exceeds maximum value', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ locations: [{ name: 'office', lat: 50, long: 181 }] }))
          .expect(400)
          .then(assertErrorFormat));
      it('400: filterSchema is not object', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ filterSchema: 1234 }))
          .expect(400)
          .then(assertErrorFormat));
      it('401: no authentication header provided', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .expect(401)
          .then(assertErrorFormat));
      it('403: userType does not have access', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.provider,
          userId: uuid(),
          marketId: uuid()
        }));
        return request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('403: trying to create provider in forbidden market', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.providerAdmin,
          userId: uuid(),
          marketId: uuid()
        }));
        return request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createValidPayload({}))
          .expect(403)
          .then(assertErrorFormat);
      });
      it('404: record not found', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ marketId: uuid() }))
          .expect(404)
          .then(assertErrorFormat));
      it('409: provider\'s name already exists', () =>
        request(app)
          .post('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ name: this.provider.name }))
          .expect(409)
          .then(assertErrorFormat));
    });
  });

  describe('GET /providers', () => {
    beforeEach(async () => {
      await Promise.map(
        new Array(10).fill(makeProvider),
        x => x({ marketId: this.market.id }));
    });

    context('success', () => {
      it('200: can list providers with genuine client token and only shows limited info', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.client,
          userId: uuid(),
          marketId: this.market.id
        });
        return request(app)
          .get('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .query({ offset: 0, limit: 8 })
          .expect(200)
          .then((res) => {
            res.body.should.have.length(8);
            res.body[0].should.have.property('id');
            res.body[0].should.have.property('name');
            res.body[0].should.have.property('description');
            res.body[0].should.have.property('filterSchema');
            res.body[0].should.have.property('imageUrl');
            res.body[0].should.have.property('locations');
            res.body[0].should.not.have.property('revisionId');
            res.body[0].should.not.have.property('marketId');
            res.body[0].should.not.have.property('webhookUrl');
            res.body[0].should.not.have.property('webhookHeaders');
            res.body[0].should.not.have.property('createdOn');
            res.body[0].should.not.have.property('updatedOn');
          });
      });
      it('200: should accept a valid provider limit/offset payload', async () => (
        request(app)
          .get('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .query({ offset: 0, limit: 8, marketId: this.market.id })
          .expect(200)
          .then((res) => {
            res.body.should.have.length(8);
          })
      ));
      it('200: should return 10 records by default and as an admin it shows all info', async () => (
        request(app)
          .get('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(200)
          .then((res) => {
            res.body.should.have.length(10);
            res.body[0].should.have.property('id');
            res.body[0].should.have.property('revisionId');
            res.body[0].should.have.property('name');
            res.body[0].should.have.property('description');
            res.body[0].should.have.property('marketId');
            res.body[0].should.have.property('filterSchema');
            res.body[0].should.have.property('webhookUrl');
            res.body[0].should.not.have.property('webhookHeaders');
            res.body[0].should.have.property('imageUrl');
            res.body[0].should.have.property('locations');
            res.body[0].should.have.property('createdOn');
            res.body[0].should.have.property('updatedOn');
          })
      ));
      it('200: provider gets himself', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.provider,
          userId: this.provider.id,
          marketId: this.market.id
        });

        return request(app)
          .get('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.should.have.length(1);
            res.body[0].id.should.equal(this.provider.id);
          });
      });
      it('200: filters provider list by marketId', async () => {
        this.otherMarket = await makeMarket({});
        await makeProvider({ marketId: this.otherMarket.id });

        return request(app)
          .get('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .query({ marketId: this.otherMarket.id })
          .expect(200)
          .then((res) => {
            res.body.length.should.equal(1);
            res.body[0].should.have.property('id');
          });
      });
      it('200: filters provider list by location', async () => {
        await makeProvider({
          marketId: this.market.id,
          locations: [{ name: 'Office', lat: 53.348359, long: -6.277348 }]
        });

        return request(app)
          .get('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(200)
          .query({
            lat: 53.346531,
            long: -6.279800,
            radius: 1,
            marketId: this.market.id
          })
          .then((res) => {
            res.body.length.should.equal(1);
          });
      });
      it('200: filters provider list by market id and location', async () => {
        await makeProvider({
          marketId: this.market.id,
          locations: [{ name: 'Office', lat: 53.348359, long: -6.277348 }]
        });
        await makeProvider({
          marketId: this.market.id,
          locations: [{ name: 'Office', lat: 0, long: 0 }]
        });
        return request(app)
          .get('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(200)
          .query({
            lat: 53.346531,
            long: -6.279800,
            radius: 1,
            marketId: this.market.id
          })
          .then((res) => {
            res.body.length.should.equal(1);
          });
      });
      it('200: filters provider list by market id and location with offset and limit', async () => {
        await makeProvider({
          marketId: this.market.id,
          locations: [{ name: 'Office', lat: 53.348359, long: -6.277348 }]
        });
        await makeProvider({
          marketId: this.market.id,
          locations: [{ name: 'Office', lat: 53.348359, long: -6.277348 }]
        });
        return request(app)
          .get('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(200)
          .query({
            offset: 0,
            limit: 1,
            lat: 53.346531,
            long: -6.279800,
            radius: 1,
            marketId: this.market.id
          })
          .then((res) => {
            res.body.length.should.equal(1);
          });
      });
      it('200: as a client, it returns a list of providers in my market without providing the marketId', async () => {
        const newMarket = await makeMarket({});
        const newProvider = await makeProvider({ marketId: newMarket.id });
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: uuid(),
          marketId: this.market.id
        }));

        return request(app)
          .get('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(200)
          .then((res) => {
            res.body.length.should.equal(10);
            res.body.map(prov => prov.id).should.not.include(newProvider.id);
          });
      });
      it('200: as a client, it returns a list of providers in my market when querying with my marketId', async () => {
        const newMarket = await makeMarket({});
        const newProvider = await makeProvider({ marketId: newMarket.id });
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: uuid(),
          marketId: this.market.id
        }));

        return request(app)
          .get('/providers')
          .query({ marketId: this.market.id })
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(200)
          .then((res) => {
            res.body.length.should.equal(10);
            res.body.map(prov => prov.id).should.not.include(newProvider.id);
          });
      });
    });
    context('error', () => {
      it('400: offset is not a number', () =>
        request(app)
          .get('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .query({ offset: 'not a number', limit: 10, marketId: this.market.id })
          .expect(400)
          .then(assertErrorFormat));
      it('400: limit is not a number', () =>
        request(app)
          .get('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .query({ offset: 0, limit: 'not a number', marketId: this.market.id })
          .expect(400)
          .then(assertErrorFormat));
      it('400: offset is < 0', () =>
        request(app)
          .get('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .query({ offset: -1, limit: 10, marketId: this.market.id })
          .expect(400)
          .then(assertErrorFormat));
      it('400: limit is = 0', () =>
        request(app)
          .get('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .query({ offset: 0, limit: 0, marketId: this.market.id })
          .expect(400)
          .then(assertErrorFormat));
      it('400: limit is < 0', () =>
        request(app)
          .get('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .query({ offset: 0, limit: -1, marketId: this.market.id })
          .expect(400)
          .then(assertErrorFormat));
      it('400: limit is > 1000', () =>
        request(app)
          .get('/providers')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .query({ offset: 0, limit: 1001, marketId: this.market.id })
          .expect(400)
          .then(assertErrorFormat));
      it('400: lat is string', () =>
        request(app)
          .get('/providers')
          .query({
            lat: 'adshasf',
            long: -0.097388,
            radius: 1,
            marketId: this.market.id
          })
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(400)
          .then(assertErrorFormat));
      it('400: long is string', () =>
        request(app)
          .get('/providers')
          .query({
            lat: 51.520153,
            long: 'adshasf',
            radius: 1,
            marketId: this.market.id
          })
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(400)
          .then(assertErrorFormat));
      it('400: radius is string', () =>
        request(app)
          .get('/providers')
          .query({
            lat: 51.520153,
            long: -0.097388,
            radius: 'adshasf',
            marketId: this.market.id
          })
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(400)
          .then(assertErrorFormat));
      it('400: lat is missing', () =>
        request(app)
          .get('/providers')
          .query({
            long: -0.097388,
            radius: 1,
            marketId: this.market.id
          })
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(400)
          .then(assertErrorFormat));
      it('400: long is missing', () =>
        request(app)
          .get('/providers')
          .query({
            lat: 51.520153,
            radius: 1,
            marketId: this.market.id
          })
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(400)
          .then(assertErrorFormat));
      it('400: radius is missing', () =>
        request(app)
          .get('/providers')
          .query({
            lat: 51.520153,
            long: -0.097388,
            marketId: this.market.id
          })
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(400)
          .then(assertErrorFormat));
      it('400: lat is below min value', () =>
        request(app)
          .get('/providers')
          .query({
            lat: -91,
            long: -0.097388,
            radius: 1,
            marketId: this.market.id
          })
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(400)
          .then(assertErrorFormat));
      it('400: long is below min value', () =>
        request(app)
          .get('/providers')
          .query({
            lat: 51.520153,
            long: -181,
            radius: 1,
            marketId: this.market.id
          })
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(400)
          .then(assertErrorFormat));
      it('400: lat is above max value', () =>
        request(app)
          .get('/providers')
          .query({
            lat: 91,
            long: -0.097388,
            radius: 1,
            marketId: this.market.id
          })
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(400)
          .then(assertErrorFormat));
      it('400: long is above max value', () =>
        request(app)
          .get('/providers')
          .query({
            lat: 51.520153,
            long: 1811,
            radius: 1,
            marketId: this.market.id
          })
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(400)
          .then(assertErrorFormat));
      it('400: radius is negative', () =>
        request(app)
          .get('/providers')
          .query({
            lat: 51.520153,
            long: 1811,
            radius: -1,
            marketId: this.market.id
          })
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(400)
          .then(assertErrorFormat));
      it('401: no authentication header provided', () =>
        request(app)
          .get('/providers')
          .set('Content-Type', 'application/json')
          .expect(401)
          .then(assertErrorFormat));
      it('403: unable query on a different market as a client', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: uuid(),
          marketId: uuid()
        }));

        return request(app)
          .get('/providers')
          .query({ marketId: this.market.id })
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
    });
  });

  describe('GET /providers/:id', () => {
    before(() => {
      this.idNotFound = uuid();
    });

    context('success', () => {
      it('200: returns the correct provider', () =>
        request(app)
          .get(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(200)
          .then((res) => {
            res.body.id.should.equal(this.provider.id);
            res.body.name.should.equal(this.provider.name);
            res.body.description.should.equal(this.provider.description);
            res.body.marketId.should.equal(this.provider.marketId);
            res.body.filterSchema.should.eql(this.provider.filterSchema);
            res.body.locations.should.eql(this.provider.locations);
            res.body.should.have.property('webhookUrl');
            res.body.should.not.have.property('webhookHeaders');
            res.body.should.have.property('createdOn');
            res.body.should.have.property('updatedOn');
          }));
      it('200: returns the correct provider using genuine providerAdmin token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.providerAdmin,
          marketId: this.market.id
        });
        return request(app)
          .get(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.id.should.equal(this.provider.id);
            res.body.name.should.equal(this.provider.name);
            res.body.description.should.equal(this.provider.description);
            res.body.marketId.should.equal(this.provider.marketId);
            res.body.filterSchema.should.eql(this.provider.filterSchema);
            res.body.locations.should.eql(this.provider.locations);
            res.body.should.have.property('webhookUrl');
            res.body.should.not.have.property('webhookHeaders');
            res.body.should.have.property('createdOn');
            res.body.should.have.property('updatedOn');
          });
      });
      it('200: returns the correct provider using genuine provider token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.provider,
          userId: this.provider.id,
          marketId: this.market.id
        });
        return request(app)
          .get(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.id.should.equal(this.provider.id);
            res.body.name.should.equal(this.provider.name);
            res.body.description.should.equal(this.provider.description);
            res.body.marketId.should.equal(this.provider.marketId);
            res.body.webhookUrl.should.equal(this.provider.webhookUrl);
            res.body.webhookHeaders.should.eql(this.provider.webhookHeaders);
            res.body.filterSchema.should.eql(this.provider.filterSchema);
            res.body.locations.should.eql(this.provider.locations);
            res.body.should.have.property('createdOn');
            res.body.should.have.property('updatedOn');
          });
      });
      it('200: returns a stripped down version of data for clients', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.clientAdmin,
          userId: this.provider.id,
          marketId: this.market.id
        });
        return request(app)
          .get(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.id.should.equal(this.provider.id);
            res.body.name.should.equal(this.provider.name);
            res.body.description.should.equal(this.provider.description);
            res.body.filterSchema.should.eql(this.provider.filterSchema);
            res.body.locations.should.eql(this.provider.locations);
            res.body.should.not.have.property('webhookUrl');
          });
      });
    });

    context('error', () => {
      it('401: no authentication header provided', () =>
        request(app)
          .get(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .expect(401)
          .then(assertErrorFormat));
      it('403: userType does not have access', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: 'noAccess',
          userId: uuid(),
          marketId: this.market.id
        }));
        return request(app)
          .get(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('403: user does not have access to the market', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.providerAdmin,
          userId: uuid(),
          marketId: uuid()
        }));
        return request(app)
          .get(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('403: user does not have access to the specific Id', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.provider,
          userId: uuid(),
          marketId: this.market.id
        }));
        return request(app)
          .get(`/providers/${uuid()}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('404: record not found', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.provider,
          userId: this.idNotFound,
          marketId: this.market.id
        }));
        return request(app)
          .get(`/providers/${this.idNotFound}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(404)
          .then(assertErrorFormat);
      });
    });
  });

  describe('PATCH /providers/:id', () => {
    before(() => {
      this.idNotFound = uuid();
      this.updatePayload = {
        description: faker.lorem.sentence()
      };
    });

    context('success', async () => {
      it('200: updates the provider', async () => {
        await request(app)
          .patch(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.updatePayload)
          .expect(200)
          .then((res) => {
            res.body.id.should.equal(this.provider.id);
            res.body.description.should.equal(this.updatePayload.description);
            res.body.should.have.property('createdOn');
            res.body.should.have.property('updatedOn');
            new Date(res.body.updatedOn).should.be.above(new Date(this.provider.updatedOn));
          });

        return request(app)
          .get(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(200)
          .then((res) => {
            res.body.id.should.equal(this.provider.id);
            res.body.description.should.equal(this.updatePayload.description);
          });
      });
      it('200: updates the provider using genuine providerAdmin token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.providerAdmin,
          marketId: this.market.id
        });
        await request(app)
          .patch(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .send(this.updatePayload)
          .expect(200)
          .then((res) => {
            res.body.id.should.equal(this.provider.id);
            res.body.description.should.equal(this.updatePayload.description);
            res.body.should.have.property('createdOn');
            res.body.should.have.property('updatedOn');
            new Date(res.body.updatedOn).should.be.above(new Date(this.provider.updatedOn));
          });

        return request(app)
          .get(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.id.should.equal(this.provider.id);
            res.body.description.should.equal(this.updatePayload.description);
          });
      });
      it('200: updates the provider using genuine provider token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.provider,
          userId: this.provider.id,
          marketId: this.market.id
        });
        await request(app)
          .patch(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .send(this.updatePayload)
          .expect(200)
          .then((res) => {
            res.body.id.should.equal(this.provider.id);
            res.body.description.should.equal(this.updatePayload.description);
            res.body.should.have.property('createdOn');
            res.body.should.have.property('updatedOn');
            new Date(res.body.updatedOn).should.be.above(new Date(this.provider.updatedOn));
          });

        return request(app)
          .get(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.id.should.equal(this.provider.id);
            res.body.description.should.equal(this.updatePayload.description);
          });
      });
    });

    context('error', () => {
      it('400: trying to update properties that do not exist', () =>
        request(app)
          .patch(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send({ noName: 'test' })
          .expect(400)
          .then(assertErrorFormat));
      it('400: trying to update name', () =>
        request(app)
          .patch(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send({ name: 'test' })
          .expect(400)
          .then(assertErrorFormat));
      it('400: trying to update description to invlaid format', () =>
        request(app)
          .patch(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.patchToken}`)
          .send({ description: '<html>' })
          .expect(400)
          .then(assertErrorFormat));
      it('400: trying to update marketId', () =>
        request(app)
          .patch(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send({ marketId: uuid() })
          .expect(400)
          .then(assertErrorFormat));
      it('401: no authentication header provided', () =>
        request(app)
          .patch(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .expect(401)
          .then(assertErrorFormat));
      it('403: userType does not have access', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: uuid(),
          marketId: uuid()
        }));
        return request(app)
          .patch(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('403: user does not have access to the specific Id', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.provider,
          userId: uuid(),
          marketId: this.market.id
        }));
        return request(app)
          .patch(`/providers/${uuid()}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('404: record not found', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.provider,
          userId: this.idNotFound,
          marketId: this.market.id
        }));
        return request(app)
          .patch(`/providers/${this.idNotFound}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.updatePayload)
          .expect(404)
          .then(assertErrorFormat);
      });
    });
  });

  describe('/providers DELETE/:id', () => {
    before(() => {
      this.idNotFound = uuid();
    });

    context('success', () => {
      it('204: should delete the relevant resource', () =>
        request(app)
          .delete(`/providers/${this.provider.id}`)
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(204));
      it('204: should delete the relevant resource using genuine providerAdmin token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.providerAdmin,
          marketId: this.market.id
        });
        return request(app)
          .delete(`/providers/${this.provider.id}`)
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(204);
      });
      it('204: should delete the relevant resource using genuine provider token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.provider,
          userId: this.provider.id,
          marketId: this.market.id
        });
        return request(app)
          .delete(`/providers/${this.provider.id}`)
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(204);
      });
    });

    context('error', () => {
      it('401: no authentication header provided', () =>
        request(app)
          .delete(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .expect(401)
          .then(assertErrorFormat));
      it('403: user does not have access', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: 'clinet',
          userId: uuid(),
          marketId: uuid()
        }));
        return request(app)
          .delete(`/providers/${this.provider.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('403: user does not have access to the specific Id', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.provider,
          userId: uuid(),
          marketId: this.market.id
        }));
        return request(app)
          .delete(`/providers/${uuid()}`)
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('404: record not found', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.provider,
          userId: this.idNotFound,
          marketId: this.market.id
        }));
        return request(app)
          .delete(`/providers/${this.idNotFound}`)
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(404)
          .then(assertErrorFormat);
      });
    });
  });

  describe('GET /providers/:id/revisions', () => {
    before(() => {
      this.idNotFound = uuid();
    });

    beforeEach(async () => {
      await request(app)
        .patch(`/providers/${this.provider.id}`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${this.tokenStub}`)
        .send({ description: 'desc 1 true' })
        .expect(200);

      await request(app)
        .patch(`/providers/${this.provider.id}`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${this.tokenStub}`)
        .send({ description: 'desc 2 true' })
        .expect(200);

      await request(app)
        .patch(`/providers/${this.provider.id}`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${this.tokenStub}`)
        .send({ description: 'the latest update' })
        .expect(200);
    });

    context('success', () => {
      it('200: returns revisions with default values', () =>
        request(app)
          .get(`/providers/${this.provider.id}/revisions`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(200)
          .then(res => res.body.length.should.equal(5)));
      it('200: returns revisions with correct limit', () =>
        request(app)
          .get(`/providers/${this.provider.id}/revisions?limit=1`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(200)
          .then((res) => {
            res.body.length.should.equal(1);
            res.body[0].id.should.equal(this.provider.id);
          }));
      it('200: returns revisions with correct offset', () =>
        request(app)
          .get(`/providers/${this.provider.id}/revisions?offset=2`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(200)
          .then((res) => {
            res.body.length.should.equal(3);
            res.body[0].id.should.equal(this.provider.id);
          }));
      it('200: returns revisions in chronological order', async () =>
        request(app)
          .get(`/providers/${this.provider.id}/revisions`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .then(res => res.body[0].description.should.equal('the latest update')));
      it('200: returns revisions using genuine providerAdmin token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.providerAdmin,
          marketId: this.market.id
        });
        return request(app)
          .get(`/providers/${this.provider.id}/revisions`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .then(res => res.body.length.should.equal(5));
      });
      it('200: returns revisions using genuine provider token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.provider,
          userId: this.provider.id,
          marketId: this.market.id
        });
        return request(app)
          .get(`/providers/${this.provider.id}/revisions`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .then(res => res.body.length.should.equal(5));
      });
    });
    context('error', () => {
      it('400: negative offset', () =>
        request(app)
          .get(`/providers/${this.provider.id}/revisions?offset=-1`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(400)
          .then(assertErrorFormat));
      it('400: invalid offset', () =>
        request(app)
          .get(`/providers/${this.provider.id}/revisions?offset=abcd`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(400)
          .then(assertErrorFormat));
      it('400: negative limit', () =>
        request(app)
          .get(`/providers/${this.provider.id}/revisions?limit=-1`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(400)
          .then(assertErrorFormat));
      it('400: invalid limit', () =>
        request(app)
          .get(`/providers/${this.provider.id}/revisions?limit=abcd`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(400)
          .then(assertErrorFormat));
      it('401: no authentication header provided', () =>
        request(app)
          .get(`/providers/${this.provider.id}/revisions`)
          .set('Content-Type', 'application/json')
          .expect(401)
          .then(assertErrorFormat));
      it('403: userType does not have access', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: 'clinet',
          userId: uuid(),
          marketId: this.market.id
        }));
        return request(app)
          .get(`/providers/${uuid()}/revisions`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('403: user does not have access to the specific Id', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.provider,
          userId: uuid(),
          marketId: this.market.id
        }));
        return request(app)
          .get(`/providers/${this.provider.id}/revisions`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('404: record not found', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.provider,
          userId: this.idNotFound,
          marketId: this.market.id
        }));
        return request(app)
          .get(`/providers/${this.idNotFound}/revisions`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(404)
          .then(assertErrorFormat);
      });
    });
  });

  describe('GET /providers/:id/revisions/:id', () => {
    before(() => {
      this.idNotFound = uuid();
    });

    context('success', () => {
      it('200: returns specific revision', () =>
        request(app)
          .get(`/providers/${this.provider.id}/revisions/${this.provider.revisionId}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(200)
          .then((res) => {
            res.body.should.have.property('id');
            res.body.id.should.equal(this.provider.id);
            res.body.should.have.property('revisionId');
            res.body.revisionId.should.equal(this.provider.revisionId);
          }));
      it('200: returns specific revision using genuine providerAdmin token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.providerAdmin,
          marketId: this.market.id
        });
        return request(app)
          .get(`/providers/${this.provider.id}/revisions/${this.provider.revisionId}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.should.have.property('id');
            res.body.id.should.equal(this.provider.id);
            res.body.should.have.property('revisionId');
            res.body.revisionId.should.equal(this.provider.revisionId);
          });
      });
      it('200: returns specific revision using genuine provider token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.provider,
          userId: this.provider.id,
          marketId: this.market.id
        });
        return request(app)
          .get(`/providers/${this.provider.id}/revisions/${this.provider.revisionId}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.should.have.property('id');
            res.body.id.should.equal(this.provider.id);
            res.body.should.have.property('revisionId');
            res.body.revisionId.should.equal(this.provider.revisionId);
          });
      });
    });

    context('error', () => {
      it('401: no authentication header provided', () =>
        request(app)
          .get(`/providers/${this.provider.id}/revisions/${this.provider.revisionId}`)
          .set('Content-Type', 'application/json')
          .expect(401)
          .then(assertErrorFormat));
      it('403: userType does not have access', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: uuid(),
          marketId: this.market.id
        }));
        return request(app)
          .get(`/providers/${this.provider.id}/revisions/${this.provider.revisionId}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('403: user does not have access to the specific provider', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.provider,
          userId: uuid(),
          marketId: this.market.id
        }));
        return request(app)
          .get(`/providers/${uuid()}/revisions/${this.provider.revisionId}`)
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('404: provider record not found', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.provider,
          userId: this.idNotFound,
          marketId: this.market.id
        }));
        return request(app)
          .get(`/providers/${this.idNotFound}/revisions/${this.provider.revisionId}`)
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(404)
          .then(assertErrorFormat);
      });
      it('404: revision record not found', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.provider,
          userId: this.provider.id,
          marketId: this.market.id
        }));
        return request(app)
          .get(`/providers/${this.provider.id}/revisions/${this.idNotFound}`)
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(404)
          .then(assertErrorFormat);
      });
    });
  });
});
