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
  makeClient,
  clearDatabase
} = Helpers;

chai.should();

/* eslint-disable */
process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise ', p, ' reason: ', reason);
  process.exit(1);
});
/* eslint-enable */

describe('/clients', () => {
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
    this.client = await makeClient({ marketId: this.market.id });
    this.createValidPayload = ({ marketId }) => ({
      name: faker.name.findName(),
      marketId: marketId || this.market.id,
      description: 'desc',
      webhookUrl: 'http://localhost:6666',
      webhookHeaders: { Authorization: '123' }
    });
    this.createBespokePayload = ({ name, marketId, description, webhookUrl, webhookHeaders }) => ({
      name: name || faker.name.findName(),
      marketId: marketId || this.market.id,
      description: description || 'description',
      webhookUrl: webhookUrl || 'http://localhost:6666',
      webhookHeaders: webhookHeaders || { Authorization: '123' }
    });
  });

  afterEach(() => {
    this.authStub.restore();
  });

  describe('POST /clients', () => {
    context('success', () => {
      it('201: should return resource', () =>
        request(app)
          .post('/clients')
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
            res.headers.should.have.property('x-request-id');
            res.headers.should.have.property('location');
            res.headers.location.should.equal(`/clients/${res.body.id}`);
          })
      );
      it('201: name should ony be unique in a single market', () =>
        request(app)
          .post('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload(
            { name: this.market.name, marketId: this.secondMarket.id })
          )
          .expect(201)
          .then(res => res.body.should.have.property('id'))
      );
      it('201: should return resource when creating client with only name and market Id', () => {
        const payload = {
          name: faker.name.findName(),
          marketId: this.market.id
        };
        return request(app)
          .post('/clients')
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
            res.headers.should.have.property('x-request-id');
            res.headers.should.have.property('location');
            res.headers.location.should.equal(`/clients/${res.body.id}`);
          });
      });
      it('201: can create client with genuine token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.clientAdmin,
          marketId: this.market.id
        });
        return request(app)
          .post('/clients')
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
            res.headers.should.have.property('x-request-id');
            res.headers.should.have.property('location');
            res.headers.location.should.equal(`/clients/${res.body.id}`);
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
          .expect(400)
          .then(assertErrorFormat);
      });
      it('400: name is an integer', () =>
        request(app)
          .post('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ name: 1 }))
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: name is an empty string', () =>
        request(app)
          .post('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(Object.assign({}, this.createValidPayload({}), { name: '' }))
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: name is null', () =>
        request(app)
          .post('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(Object.assign({}, this.createValidPayload({}), { name: null }))
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: name is not in valid format', () =>
        request(app)
          .post('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.postToken}`)
          .send(this.createBespokePayload({ name: '<html>' }))
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: description is an integer', () =>
        request(app)
          .post('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ description: 1 }))
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: description is an empty string', () =>
        request(app)
          .post('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(Object.assign({}, this.createValidPayload({}), { description: '' }))
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: description is in invalid format', () =>
        request(app)
          .post('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.postToken}`)
          .send(this.createBespokePayload({ description: '<html>' }))
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: marketId is null', () =>
        request(app)
          .post('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(Object.assign({}, this.createValidPayload({}), { marketId: null }))
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: marketId is not uuid', () =>
        request(app)
          .post('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ marketId: 1234 }))
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: webhookUrl is not string', () =>
        request(app)
          .post('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ webhookUrl: 1234 }))
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: webhookUrl is null', () =>
        request(app)
          .post('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(Object.assign({}, this.createValidPayload({}), { webhookUrl: null }))
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: webhookHeaders is not object', () =>
        request(app)
          .post('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ webhookHeaders: 1234 }))
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: webhookHeaders is null', () =>
        request(app)
          .post('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(Object.assign({}, this.createValidPayload({}), { webhookHeaders: null }))
          .expect(400)
          .then(assertErrorFormat)
      );
      it('401: no authentication header provided', () =>
        request(app)
          .post('/clients')
          .set('Content-Type', 'application/json')
          .expect(401)
          .then(assertErrorFormat)
      );
      it('403: userType does not have access', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: uuid(),
          marketId: uuid()
        }));
        return request(app)
          .post('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('403: trying to create client in forbidden market', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.clientAdmin,
          userId: uuid(),
          marketId: uuid()
        }));
        return request(app)
          .post('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createValidPayload({}))
          .expect(403)
          .then(assertErrorFormat);
      });
      it('404: record not found', () =>
        request(app)
          .post('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ marketId: uuid() }))
          .expect(404)
          .then(assertErrorFormat)
      );
      it('409: client\'s name already exists', () =>
        request(app)
          .post('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createBespokePayload({ name: this.client.name }))
          .expect(409)
          .then(assertErrorFormat)
      );
    });
  });

  describe('GET /clients', () => {
    beforeEach(async () => {
      await Promise.map(
        new Array(10).fill(makeClient),
        x => x({ marketId: this.market.id })
      );
    });

    context('success', () => {
      it('200: should accept a valid client limit/offset payload', async () => (
        request(app)
          .get('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .query({ offset: 0, limit: 8, marketId: this.market.id })
          .expect(200)
          .then((res) => {
            res.body.should.have.length(8);
            res.body[0].should.have.property('id');
            res.body[0].should.have.property('name');
            res.body[0].should.have.property('description');
            res.body[0].should.have.property('marketId');
            res.body[0].should.have.property('webhookUrl');
            res.body[0].should.have.property('createdOn');
            res.body[0].should.have.property('updatedOn');
            res.body[0].should.not.have.property('webhookHeaders');
          })
      ));
      it('200: should return 10 records by default', async () => (
        request(app)
          .get('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .query({ marketId: this.market.id })
          .expect(200)
          .then((res) => {
            res.body.should.have.length(10);
          })
      ));
      it('200: filters client list by marketId', async () => {
        this.otherMarket = await makeMarket({});
        await makeClient({ marketId: this.otherMarket.id });

        return request(app)
          .get('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .query({ marketId: this.otherMarket.id })
          .expect(200)
          .then((res) => {
            res.body.length.should.equal(1);
            res.body[0].should.have.property('id');
          });
      });
      it('200: only returns clients in the user\'s market', async () => {
        this.otherMarket = await makeMarket({});
        this.otherClient = await makeClient({ marketId: this.otherMarket.id });

        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.client,
          userId: this.otherClient.id,
          marketId: this.otherMarket.id
        });

        request(app)
          .get('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.length.should.equal(1);
            res.body[0].should.have.property('id');
          });

        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.clientAdmin,
          marketId: this.otherMarket.id
        });

        request(app)
          .get('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.length.should.equal(1);
            res.body[0].should.have.property('id');
          });
      });
      it('200: client gets himself', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.client,
          userId: this.client.id,
          marketId: this.market.id
        });

        return request(app)
          .get('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.should.have.length(1);
            res.body[0].id.should.equal(this.client.id);
          });
      });
    });

    context('error', () => {
      it('400: offset is not a number', () =>
        request(app)
          .get('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .query({ offset: 'not a number', limit: 10, marketId: this.market.id })
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: limit is not a number', () =>
        request(app)
          .get('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .query({ offset: 0, limit: 'not a number', marketId: this.market.id })
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: offset is < 0', () =>
        request(app)
          .get('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .query({ offset: -1, limit: 10, marketId: this.market.id })
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: limit is = 0', () =>
        request(app)
          .get('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .query({ offset: 0, limit: 0, marketId: this.market.id })
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: limit is < 0', () =>
        request(app)
          .get('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .query({ offset: 0, limit: -1, marketId: this.market.id })
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: limit is > 1000', () =>
        request(app)
          .get('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .query({ offset: 0, limit: 1001, marketId: this.market.id })
          .expect(400)
          .then(assertErrorFormat)
      );
      it('401: no authentication header provided', () => request(app)
        .get('/clients')
        .set('Content-Type', 'application/json')
        .expect(401)
        .then(assertErrorFormat)
      );
      it('403: user does not have access to market in query', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.clientAdmin,
          userId: uuid(),
          marketId: uuid()
        }));
        return request(app)
          .get('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .query({ marketId: uuid() })
          .expect(403)
          .then(assertErrorFormat);
      });
      it('403: user does not have access', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.provider,
          userId: uuid(),
          marketId: this.market.id
        }));
        return request(app)
          .get('/clients')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
    });
  });

  describe('GET /clients/:id', () => {
    before(() => {
      this.idNotFound = uuid();
    });

    context('success', () => {
      it('200: returns the correct client', () =>
        request(app)
          .get(`/clients/${this.client.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(200)
          .then((res) => {
            res.body.id.should.equal(this.client.id);
            res.body.name.should.equal(this.client.name);
            res.body.description.should.equal(this.client.description);
            res.body.marketId.should.equal(this.client.marketId);
            res.body.should.have.property('webhookUrl');
            res.body.should.not.have.property('webhookHeaders');
            res.body.should.have.property('createdOn');
            res.body.should.have.property('updatedOn');
          })
      );
      it('200: can get a client with genuine clientAdmin token', async () => {
        this.authStub.restore();
        this.clientAdminToken = await tokenGenerator.create({
          userType: roles.clientAdmin,
          marketId: this.market.id
        });
        return request(app)
          .get(`/clients/${this.client.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.clientAdminToken}`)
          .expect(200);
      });
      it('200: can get a client with genuine client token', async () => {
        this.authStub.restore();
        this.clientToken = await tokenGenerator.create({
          userType: roles.client,
          userId: this.client.id,
          marketId: this.market.id
        });
        return request(app)
          .get(`/clients/${this.client.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.clientToken}`)
          .expect(200)
          .then((res) => {
            res.body.id.should.equal(this.client.id);
          });
      });
    });

    context('error', () => {
      it('401: no authentication header provided', () =>
        request(app)
          .get(`/clients/${this.client.id}`)
          .set('Content-Type', 'application/json')
          .expect(401)
          .then(assertErrorFormat)
      );
      it('403: userType does not have access', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.provider,
          userId: uuid(),
          marketId: uuid()
        }));
        return request(app)
          .get(`/clients/${this.client.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('403: user does not have access to the specific Id', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: uuid(),
          marketId: uuid()
        }));
        return request(app)
          .get(`/clients/${uuid()}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('403: userType does not have access to the market', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.clientAdmin,
          userId: uuid(),
          marketId: uuid()
        }));
        return request(app)
          .get(`/clients/${this.client.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('404: record not found', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: this.idNotFound,
          marketId: uuid()
        }));
        return request(app)
          .get(`/clients/${this.idNotFound}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(404)
          .then(assertErrorFormat);
      });
    });
  });

  describe('PATCH /clients/:id', () => {
    before(() => {
      this.idNotFound = uuid();
      this.updatePayload = {
        description: faker.lorem.sentence()
      };
    });

    context('success', () => {
      it('200: updates the client', async () => {
        await request(app)
          .patch(`/clients/${this.client.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.updatePayload)
          .expect(200)
          .then((res) => {
            res.body.id.should.equal(this.client.id);
            res.body.description.should.equal(this.updatePayload.description);
            res.body.should.have.property('createdOn');
            res.body.should.have.property('updatedOn');
            new Date(res.body.updatedOn).should.be.above(new Date(this.client.updatedOn));
          });
      });
      it('200: can patch a client with genuine clientAdmin token', async () => {
        this.authStub.restore();
        this.clientAdminToken = await tokenGenerator.create({
          userType: roles.clientAdmin,
          userId: uuid(),
          marketId: this.market.id
        });
        return request(app)
          .patch(`/clients/${this.client.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.clientAdminToken}`)
          .send(this.updatePayload)
          .expect(200);
      });
      it('200: can patch a client with genuine client token', async () => {
        this.authStub.restore();
        this.clientToken = await tokenGenerator.create({
          userType: roles.client,
          userId: this.client.id,
          marketId: this.market.id
        });
        return request(app)
          .patch(`/clients/${this.client.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.clientToken}`)
          .send(this.updatePayload)
          .expect(200);
      });
    });

    context('error', () => {
      it('400: trying to update properties that do not exist', () =>
        request(app)
          .patch(`/clients/${this.client.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send({ noName: 'test' })
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: trying to update name', () =>
        request(app)
          .patch(`/clients/${this.client.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send({ name: 'test' })
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: trying to update description to invalid format', () =>
        request(app)
          .patch(`/clients/${this.client.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.patchToken}`)
          .send({ description: '<html>' })
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: trying to update marketId', () =>
        request(app)
          .patch(`/clients/${this.client.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send({ marketId: uuid() })
          .expect(400)
          .then(assertErrorFormat)
      );
      it('403: userType does not have access', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.provider,
          userId: uuid(),
          marketId: uuid()
        }));
        return request(app)
          .patch(`/clients/${this.client.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.noAccessToken}`)
          .expect(403)
          .then(assertErrorFormat);
      }
      );
      it('403: user does not have access to the specific Id', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: uuid(),
          marketId: uuid()
        }));
        return request(app)
          .patch(`/clients/${uuid()}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      }
      );
      it('403: user does not have access to the market', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.providerAdmin,
          userId: this.client.id,
          marketId: uuid()
        }));
        return request(app)
          .patch(`/clients/${this.client.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.updatePayload)
          .expect(403)
          .then(assertErrorFormat);
      }
      );
      it('404: record not found', () =>
        request(app)
          .patch(`/clients/${this.idNotFound}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.updatePayload)
          .expect(404)
          .then(assertErrorFormat)
      );
      it('401: no authentication header provided', () =>
        request(app)
          .patch(`/clients/${this.client.id}`)
          .set('Content-Type', 'application/json')
          .expect(401)
          .then(assertErrorFormat)
      );
    });
  });

  describe('DELETE /clients/:id', () => {
    before(() => {
      this.idNotFound = uuid();
    });

    context('success', () => {
      it('204: should delete the relevant resource', () =>
        request(app)
          .delete(`/clients/${this.client.id}`)
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(204)
      );
      it('204: can delete a client with genuine clientAdmin token', async () => {
        this.clientAdminToken = await tokenGenerator.create({
          userType: roles.clientAdmin,
          marketId: this.market.id
        });
        return request(app)
          .delete(`/clients/${this.client.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.clientAdminToken}`)
          .send(this.updatePayload)
          .expect(204);
      });
      it('204: can delete a client with genuine client token', async () => {
        this.authStub.restore();
        this.clientToken = await tokenGenerator.create({
          userType: roles.client,
          userId: this.client.id,
          marketId: this.market.id
        });
        return request(app)
          .delete(`/clients/${this.client.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.clientToken}`)
          .send(this.updatePayload)
          .expect(204);
      });
    });

    context('error', () => {
      it('403: userType does not have access', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.provider,
          userId: uuid(),
          marketId: uuid()
        }));
        return request(app)
          .delete(`/clients/${this.client.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('403: user does not have access to the specific Id', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: uuid(),
          marketId: uuid()
        }));
        return request(app)
          .delete(`/clients/${uuid()}`)
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('404: record not found', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.clientAdmin,
          userId: this.idNotFound,
          marketId: this.market.id
        }));
        return request(app)
          .delete(`/clients/${this.idNotFound}`)
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(404)
          .then(assertErrorFormat);
      });
      it('401: no authentication header provided', () =>
        request(app)
          .delete(`/clients/${this.client.id}`)
          .set('Content-Type', 'application/json')
          .expect(401)
          .then(assertErrorFormat)
      );
    });
  });

  describe('GET /clients/:id/revisions', () => {
    before(() => {
      this.idNotFound = uuid();
    });

    beforeEach(async () => {
      await request(app)
        .patch(`/clients/${this.client.id}`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${this.tokenStub}`)
        .send({ description: 'desc 1 true' })
        .expect(200);

      await request(app)
        .patch(`/clients/${this.client.id}`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${this.tokenStub}`)
        .send({ description: 'desc 2 true' })
        .expect(200);

      await request(app)
        .patch(`/clients/${this.client.id}`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${this.tokenStub}`)
        .send({ description: 'the latest update' })
        .expect(200);
    });

    context('success', () => {
      it('200: returns revisions with default values', () =>
        request(app)
          .get(`/clients/${this.client.id}/revisions`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(200)
          .then(res => res.body.length.should.equal(5))
      );
      it('200: returns revisions with correct limit', () =>
        request(app)
          .get(`/clients/${this.client.id}/revisions?limit=1`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(200)
          .then((res) => {
            res.body.length.should.equal(1);
            res.body[0].id.should.equal(this.client.id);
          })
      );
      it('200: returns revisions with correct offset', () =>
        request(app)
          .get(`/clients/${this.client.id}/revisions?offset=2`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(200)
          .then((res) => {
            res.body.length.should.equal(3);
            res.body[0].id.should.equal(this.client.id);
          })
      );
      it('200: returns revisions in chronological order', async () =>
        request(app)
          .get(`/clients/${this.client.id}/revisions`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .then(res => res.body[0].description.should.equal('the latest update'))
      );
      it('200: returns revisions using genuine clientAdmin token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.clientAdmin,
          marketId: this.market.id
        });
        return request(app)
          .get(`/clients/${this.client.id}/revisions`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then(res => res.body.length.should.equal(5));
      });
      it('200: returns revisions using genuine client token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.client,
          userId: this.client.id,
          marketId: this.market.id
        });
        return request(app)
          .get(`/clients/${this.client.id}/revisions`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then(res => res.body.length.should.equal(5));
      });
    });

    context('error', () => {
      it('400: negative offset', () =>
        request(app)
          .get(`/clients/${this.client.id}/revisions?offset=-1`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.listRevisionsToken}`)
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: invalid offset', () =>
        request(app)
          .get(`/clients/${this.client.id}/revisions?offset=abcd`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.listRevisionsToken}`)
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: negative limit', () =>
        request(app)
          .get(`/clients/${this.client.id}/revisions?limit=-1`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.listRevisionsToken}`)
          .expect(400)
          .then(assertErrorFormat)
      );
      it('400: invalid limit', () =>
        request(app)
          .get(`/clients/${this.client.id}/revisions?limit=abcd`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.listRevisionsToken}`)
          .expect(400)
          .then(assertErrorFormat)
      );
      it('401: no authentication header provided', () =>
        request(app)
          .get(`/clients/${this.client.id}/revisions`)
          .set('Content-Type', 'application/json')
          .expect(401)
          .then(assertErrorFormat)
      );
      it('403: userType does not have access', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.provider,
          userId: this.client.id,
          marketId: uuid()
        }));
        return request(app)
          .get(`/clients/${uuid()}/revisions`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.listRevisionsToken}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('403: userType does not have access to market', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.clientAdmin,
          userId: this.client.id,
          marketId: uuid()
        }));
        return request(app)
          .get(`/clients/${this.client.id}/revisions`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.listRevisionsToken}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('403: user does not have access to the specific Id', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: uuid(),
          marketId: uuid()
        }));
        return request(app)
          .get(`/clients/${this.client.id}/revisions`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.noAccessToken}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('404: record not found', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: this.idNotFound,
          marketId: uuid()
        }));
        return request(app)
          .get(`/clients/${this.idNotFound}/revisions`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.listRevisionsToken}`)
          .expect(404)
          .then(assertErrorFormat);
      });
    });
  });

  describe('GET /clients/:id/revisions/:id', () => {
    before(() => {
      this.idNotFound = uuid();
    });

    context('success', () => {
      it('200: returns specific revision', () =>
        request(app)
          .get(`/clients/${this.client.id}/revisions/${this.client.revisionId}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(200)
          .then((res) => {
            res.body.should.have.property('id');
            res.body.id.should.equal(this.client.id);
            res.body.should.have.property('revisionId');
            res.body.revisionId.should.equal(this.client.revisionId);
          })
      );
      it('200: returns specific revision using genuine clientAdmin token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.clientAdmin,
          marketId: this.market.id
        });
        return request(app)
          .get(`/clients/${this.client.id}/revisions/${this.client.revisionId}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.should.have.property('id');
            res.body.id.should.equal(this.client.id);
            res.body.should.have.property('revisionId');
            res.body.revisionId.should.equal(this.client.revisionId);
          });
      });
      it('200: returns specific revision using genuine client token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.client,
          userId: this.client.id,
          marketId: this.market.id
        });
        return request(app)
          .get(`/clients/${this.client.id}/revisions/${this.client.revisionId}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.should.have.property('id');
            res.body.id.should.equal(this.client.id);
            res.body.should.have.property('revisionId');
            res.body.revisionId.should.equal(this.client.revisionId);
          });
      });
    });

    context('error', () => {
      it('401: no authentication header provided', () =>
        request(app)
          .get(`/clients/${this.client.id}/revisions/${this.client.revisionId}`)
          .set('Content-Type', 'application/json')
          .expect(401)
          .then(assertErrorFormat)
      );
      it('403: userType does not have access', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.provider,
          userId: this.client.id,
          marketId: uuid()
        }));
        return request(app)
          .get(`/clients/${this.client.id}/revisions/${this.client.revisionId}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('403: user does not have access to the specific Id', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: this.client.id,
          marketId: uuid()
        }));
        return request(app)
          .get(`/clients/${this.client.id}/revisions/${this.client.revisionId}`)
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('403: user does not have access to the specific client', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: this.client.id,
          marketId: uuid()
        }));
        return request(app)
          .get(`/clients/${uuid()}/revisions/${this.client.revisionId}`)
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('404: client record not found', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: this.idNotFound,
          marketId: uuid()
        }));
        return request(app)
          .get(`/clients/${this.idNotFound}/revisions/${this.client.revisionId}`)
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(404)
          .then(assertErrorFormat);
      });
      it('404: revision record not found', () => {
        this.authStub.restore();
        sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.clientAdmin,
          userId: this.client.id,
          marketId: this.market.id
        }));
        return request(app)
          .get(`/clients/${this.client.id}/revisions/${this.idNotFound}`)
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(404)
          .then(assertErrorFormat);
      });
    });
  });
});
