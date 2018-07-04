const chai = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const uuid = require('uuid/v4');
const Promise = require('bluebird');
const { app } = require('../../src');
const { roles } = require('../../src/config');
const { tokenGenerator } = require('../assets');
const { authentication } = require('../../src/authentication');
const { SimpleServer } = require('../assets/simpleserver');
const { Helpers } = require('../assets');

const {
  authStub,
  assertErrorFormat,
  clearDatabase,
  makeClient,
  makeMarket,
  makeProvider
} = Helpers;

chai.should();

/* eslint-disable */
process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise ', p, ' reason: ', reason);
  process.exit(1);
});
/* eslint-enable */

describe('/rfqs', () => {
  before(() => {
    this.tokenStub = 123;
    this.stub = ({ userType = roles.superAdmin, userId = uuid(), marketId = uuid() }) =>
      sinon.stub(authentication, 'validate').returns(authStub({ userType, userId, marketId }));
  });
  beforeEach(async () => {
    this.authStub = this.stub({});

    await clearDatabase();
    this.market = await makeMarket({ rfqSchema: { type: 'object', required: ['test'] } });
    this.client = await makeClient({ marketId: this.market.id });
    this.provider = await makeProvider({ webhookUrl: 'http://localhost:3001', marketId: this.market.id });

    this.createPayload = ({
      payload = { test: 'test' },
      onBehalfOf = 'OBO',
      requestGroup = [this.provider.id],
      lifespan = undefined
    }) => ({ payload, onBehalfOf, requestGroup, lifespan });

    this.makeRfq = ({
      token = this.tokenStub,
      payload = { test: 'test' },
      requestGroup = [this.provider.id],
      lifespan = 3600000,
      onBehalfOf = 'OBO'
    }) => request(app)
      .post('/rfqs')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .send(this.createPayload({ payload, requestGroup, lifespan, onBehalfOf }))
      .expect(201)
      .then(res => res.body);

    this.assertGetRfqs = ({ token = this.tokenStub, query = {}, status }) => request(app)
      .get('/rfqs')
      .query(query)
      .set('Authorization', `Bearer ${token}`)
      .expect(status)
      .then(res => res);
  });

  afterEach(() => {
    this.authStub.restore();
  });

  describe('POST', () => {
    context('success', () => {
      beforeEach(async () => {
        const responseFn = (req, res) => {
          res.statusCode = 200;
          res.end();
        };
        this.server = new SimpleServer({ responseFn });
        await this.server.start({ port: 3001, host: 'localhost' });
      });

      afterEach(async () => {
        await this.server.close();
      });

      it('201: creates an rfq from a valid payload using genuine client token', async () => {
        const payload = this.createPayload({});
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.client,
          userId: this.client.id,
          marketId: this.market.id
        });
        return request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .send(payload)
          .expect(201)
          .then((res) => {
            res.body.should.have.property('id');
            res.body.clientId.should.equal(this.client.id);
          });
      });

      it('201: creates an rfq from a valid payload', async () => {
        const payload = this.createPayload({});
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
        return request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(payload)
          .expect(201)
          .then((res) => {
            res.body.should.have.property('id');
            res.body.payload.should.eql(payload.payload);
            res.body.requestGroup.should.eql(payload.requestGroup);
            res.body.clientId.should.equal(this.client.id);
            res.body.marketId.should.equal(this.market.id);
            res.body.lifespan.should.equal(this.market.rfqDefaultLifespan);
            res.body.should.have.property('createdOn');
            res.body.should.not.have.property('onBehalfOf');
            res.headers.location.should.equal(`/rfqs/${res.body.id}`);
          });
      });

      it('201: creates an rfq if sending to more than 10 providers', async () => {
        const providerIds = await Promise.map(
          new Array(11).fill(makeProvider),
          x => x({ marketId: this.market.id })).map(x => x.id);
        const payload = this.createPayload({ requestGroup: providerIds });
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
        return request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(payload)
          .expect(201)
          .then((res) => {
            res.body.should.have.property('id');
            res.body.payload.should.eql(payload.payload);
            res.body.requestGroup.should.eql(payload.requestGroup);
            res.body.clientId.should.equal(this.client.id);
            res.body.marketId.should.equal(this.market.id);
            res.body.lifespan.should.equal(this.market.rfqDefaultLifespan);
            res.body.should.have.property('createdOn');
            res.body.should.not.have.property('onBehalfOf');
            res.headers.location.should.equal(`/rfqs/${res.body.id}`);
          });
      });

      it('201: can set the rfq lifespan', () => {
        const payload = this.createPayload({ lifespan: 3600000 });
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
        return request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(payload)
          .expect(201)
          .then(res => res.body.lifespan.should.equal(payload.lifespan));
      });

      it('201: should send rfq to provider', () => new Promise(async (resolve) => {
        let response;
        this.server.on('newRequest', (newRequest) => {
          const req = JSON.parse(newRequest.body);
          req.type.should.equal('RFQ');
          req.event.should.equal('CREATE');
          req.data.id.should.equal(response.body.id);
          req.data.payload.should.eql(this.createPayload({}).payload);
          req.data.should.have.property('expiresAt');
          resolve();
        });
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });

        await request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createPayload({}))
          .expect(201)
          .then((res) => { response = res; });
      }));

      it("201: if the rfq doesn't pass the filter schema, it sends a decline to the client and still sends valid rfq to provider",
        async () => {
          const market = await makeMarket({
            rfqSchema: {
              type: 'object',
              required: ['value', 'duration'],
              additonalProperties: false,
              properties: {
                value: {
                  description: 'amount to repay',
                  type: ['number', 'integer'],
                  minimum: 1000
                },
                duration: {
                  description: 'Number of months of term',
                  type: ['number', 'integer'],
                  minimum: 6
                }
              }
            }
          });

          const rejectProvider = await makeProvider({
            filterSchema: {
              type: 'object',
              properties: { value: { maximum: 5000 } }
            },
            marketId: market.id
          });

          const validProvider = await makeProvider({
            marketId: market.id, webhookUrl: 'http://localhost:3001' });

          const client = await makeClient({
            marketId: market.id, webhookUrl: 'http://localhost:3001' });

          return new Promise(async (resolve) => {
            let rfq;
            const payload = { value: 5001, duration: 12 };

            this.server.on('newRequest', (newRequest) => {
              const req = JSON.parse(newRequest.body);
              if (req.type === 'DECLINE') {
                req.event.should.equal('CREATE');
                req.data.should.have.property('id');
                req.data.rfqId.should.equal(rfq.id);
                req.data.marketId.should.equal(market.id);
                req.data.clientId.should.equal(client.id);
                req.data.providerId.should.equal(rejectProvider.id);
                req.data.should.have.property('reasons');
              }
              if (req.type === 'RFQ') {
                req.event.should.equal('CREATE');
                req.data.id.should.equal(rfq.id);
                req.data.payload.should.eql(payload);
                req.data.should.have.property('expiresAt');
              }
              const reqTypes = this.server.getRequests().map(r => JSON.parse(r.body).type);
              if (reqTypes.includes('DECLINE') && reqTypes.includes('RFQ')) resolve();
            });

            this.authStub.restore();
            this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
              userType: roles.client,
              userId: client.id,
              marketId: market.id
            }));

            await request(app)
              .post('/rfqs')
              .set('Content-Type', 'application/json')
              .set('Authorization', `Bearer ${client.token}`)
              .send({
                requestGroup: [rejectProvider.id, validProvider.id],
                payload,
                onBehalfOf: 'obo'
              })
              .expect(201)
              .then((res) => { rfq = res.body; });
          });
        });
      it('201: should notify client if rfq does not reach provider', async () => {
        let response;
        const otherProvider = await makeProvider({ webhookUrl: 'NO URL', marketId: this.market.id });
        const otherClient = await makeClient({ webhookUrl: 'http://localhost:3001', marketId: this.market.id });

        return new Promise((resolve) => {
          this.server.on('newRequest', (newRequest) => {
            const req = JSON.parse(newRequest.body);
            if (req.type !== 'RFQ') { return; }
            req.type.should.equal('RFQ');
            req.event.should.equal('DELIVERY FAIL');
            req.data.id.should.equal(response.body.id);
            req.data.payload.should.eql(response.body.payload);
            req.data.should.have.property('expiresAt');
            response.body.requestGroup.should.include(req.data.providerId);
            resolve();
          });
          this.authStub.restore();
          this.authStub = this.stub({
            userType: roles.client, userId: otherClient.id, marketId: this.market.id
          });

          request(app)
            .post('/rfqs')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${this.tokenStub}`)
            .send(this.createPayload({ requestGroup: [otherProvider.id] }))
            .expect(201)
            .then((res) => { response = res; });
        });
      });
    });

    context('error', () => {
      it('400: payload does not include payload object', () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
        return request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send({ requestGroup: [this.provider.id] })
          .expect(400)
          .then(assertErrorFormat);
      });
      it('400: payload does not include requestGroup', () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
        return request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send({ payload: { test: 'test' } })
          .expect(400)
          .then(assertErrorFormat);
      });
      it('400: payload property is not an object', () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
        return request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createPayload({ payload: [1, 2, 3] }))
          .expect(400)
          .then(assertErrorFormat);
      });
      it('400: requestGroup property that is not an array', () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
        return request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createPayload({ requestGroup: { test: 'test' } }))
          .expect(400)
          .then(assertErrorFormat);
      });
      it('400: requestGroup with non-uuid elements', () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.i });
        return request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createPayload({ requestGroup: [1] }))
          .expect(400)
          .then(assertErrorFormat);
      });
      it('400: requestGroup is empty', () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
        return request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createPayload({ requestGroup: [] }))
          .expect(400)
          .then(assertErrorFormat);
      });
      it('400: payload does not match market schema', () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
        return request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createPayload({ payload: { noTest: 'test' } }))
          .expect(400)
          .then(assertErrorFormat);
      });
      it('400: rfq lifespan is below minimum', () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
        return request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createPayload({ lifespan: 3599999 }))
          .expect(400)
          .then(assertErrorFormat);
      });
      it('400: provider is not in the correct market', async () => {
        const otherMarket = await makeMarket({ token: this.tokenStub });
        const provider = await makeProvider({
          token: this.makeProviderToken,
          marketId: otherMarket.id
        });

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
        return request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createPayload({ requestGroup: [provider.id] }))
          .expect(400)
          .then(assertErrorFormat);
      });
      it('401: no auth header provided', () => request(app)
        .post('/rfqs')
        .set('Content-Type', 'application/json')
        .send(this.createPayload({}))
        .expect(401)
        .then(assertErrorFormat));
      it('403: userType does not have access', () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: this.client.id, marketId: this.market.id
        });
        return request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.noAccessToken}`)
          .send(this.createPayload({}))
          .expect(403)
          .then(assertErrorFormat);
      });
      it('404: requestGroup with non existing providers', () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
        return request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createPayload({ requestGroup: [uuid()] }))
          .expect(404)
          .then(assertErrorFormat);
      });
      it('404: inactive market', async () => {
        await request(app)
          .patch(`/markets/${this.market.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send({ isActive: false })
          .expect(200);

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
        return request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createPayload({}))
          .expect(404)
          .then(assertErrorFormat);
      });
    });
  });

  describe('/rfqs GET/:id', () => {
    beforeEach(async () => {
      this.authStub.restore();
      this.authStub = this.stub({
        userType: roles.client, userId: this.client.id, marketId: this.market.id
      });
      this.rfq = await request(app)
        .post('/rfqs')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${this.client.token}`)
        .send(this.createPayload({ onBehalfOf: 'OBO' }))
        .expect(201)
        .then(res => res.body);
    });

    context('success', () => {
      it('200: returns rfq using genuine client token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.client,
          userId: this.client.id,
          marketId: this.market.id
        });
        return request(app)
          .get(`/rfqs/${this.rfq.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.id.should.equal(this.rfq.id);
            res.body.payload.should.eql(this.rfq.payload);
            res.body.requestGroup.should.eql(this.rfq.requestGroup);
            res.body.marketId.should.equal(this.market.id);
            res.body.clientId.should.equal(this.client.id);
            res.body.lifespan.should.equal(this.market.rfqDefaultLifespan);
            res.body.should.have.property('createdOn');
            res.body.should.have.property('onBehalfOf');
          });
      });
      it('200: returns the correct rfq', () => request(app)
        .get(`/rfqs/${this.rfq.id}`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${this.getSingleRfqToken}`)
        .expect(200)
        .then((res) => {
          res.body.id.should.equal(this.rfq.id);
          res.body.payload.should.eql(this.rfq.payload);
          res.body.marketId.should.equal(this.market.id);
          res.body.clientId.should.equal(this.client.id);
          res.body.lifespan.should.equal(this.market.rfqDefaultLifespan);
          res.body.should.have.property('createdOn');
          res.body.should.have.property('onBehalfOf');
        }));

      it('200: as a client, returns the correct rfq', () => request(app)
        .get(`/rfqs/${this.rfq.id}`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${this.client.token}`)
        .expect(200)
        .then((res) => {
          res.body.id.should.equal(this.rfq.id);
          res.body.payload.should.eql(this.rfq.payload);
          res.body.requestGroup.should.eql(this.rfq.requestGroup);
          res.body.marketId.should.equal(this.market.id);
          res.body.clientId.should.equal(this.client.id);
          res.body.lifespan.should.equal(this.market.rfqDefaultLifespan);
          res.body.should.have.property('createdOn');
          res.body.should.have.property('onBehalfOf');
        }));

      it('200: returns the correct rfq, with an onBehalfOf set in the header', () => request(app)
        .get(`/rfqs/${this.rfq.id}`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${this.client.token}`)
        .set('On-Behalf-Of', 'OBO')
        .expect(200)
        .then((res) => {
          res.body.id.should.equal(this.rfq.id);
          res.body.payload.should.eql(this.rfq.payload);
          res.body.requestGroup.should.eql(this.rfq.requestGroup);
          res.body.marketId.should.equal(this.market.id);
          res.body.clientId.should.equal(this.client.id);
          res.body.lifespan.should.equal(this.market.rfqDefaultLifespan);
          res.body.should.have.property('createdOn');
          res.body.should.have.property('onBehalfOf');
        }));

      it('200: as a provider, returns the correct rfq without the requestGroup', () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userId: this.provider.id,
          userType: 'provider',
          marketId: this.market.id
        }));
        return request(app)
          .get(`/rfqs/${this.rfq.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.provider.token}`)
          .expect(200)
          .then((res) => {
            res.body.id.should.equal(this.rfq.id);
            res.body.payload.should.eql(this.rfq.payload);
            res.body.should.not.have.property('requestGroup');
            res.body.marketId.should.equal(this.market.id);
            res.body.clientId.should.equal(this.client.id);
            res.body.lifespan.should.equal(this.market.rfqDefaultLifespan);
            res.body.should.have.property('createdOn');
            res.body.should.not.have.property('onBehalfOf');
          });
      });
    });

    context('error', () => {
      it('400: id not uuid', () =>
        request(app)
          .get('/rfqs/1')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.getSingleRfqToken}`)
          .expect(400)
          .then(assertErrorFormat));

      it('401: no auth header provided', () =>
        request(app)
          .get(`/rfqs/${this.rfq.id}`)
          .set('Content-Type', 'application/json')
          .expect(401)
          .then(assertErrorFormat)
      );
      it('403: user does not have access to route', () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: 'noAccess', userId: this.client.id, marketId: this.market.id
        });
        return request(app)
          .get(`/rfqs/${this.rfq.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(403)
          .then(assertErrorFormat);
      });
      it('404: record not found', () =>
        request(app)
          .get(`/rfqs/${uuid()}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .expect(404)
          .then(assertErrorFormat));
      it('404: rfq does not match the onBehalfOf property', () =>
        request(app)
          .get(`/rfqs/${this.rfq.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .set('On-Behalf-Of', 'someone else')
          .expect(404)
          .then(assertErrorFormat));
    });
  });

  describe('GET /:id/status', () => {
    beforeEach(async () => {
      this.authStub.restore();
      this.authStub = this.stub({
        userType: roles.client, userId: this.client.id, marketId: this.market.id
      });

      await Promise.map(new Array(5).fill(this.makeRfq), fn => fn({}));
      this.rfq = await this.makeRfq({});
    });
    context('success', () => {
      it('200: should return rfq using genuine client token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.client,
          userId: this.client.id,
          marketId: this.market.id
        });
        return request(app)
          .get(`/rfqs/${this.rfq.id}/status`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body[0].should.have.property('id');
            res.body.every(dispatch => dispatch.batchId === this.rfq.id).should.equal(true);
            res.body[0].should.have.property('request');
            res.body[0].should.have.property('isDead');
            res.body[0].should.have.property('isDelivered');
            res.body[0].should.have.property('error');
            res.body[0].should.have.property('deliveredAt');
            res.body[0].should.have.property('killedAt');
          });
      });
      it('200: should return correct rfq', () => request(app)
        .get(`/rfqs/${this.rfq.id}/status`)
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${this.getSingleRfqToken}`)
        .expect(200)
        .then((res) => {
          res.body[0].should.have.property('id');
          res.body.every(dispatch => dispatch.batchId === this.rfq.id).should.equal(true);
          res.body[0].should.have.property('request');
          res.body[0].should.have.property('isDead');
          res.body[0].should.have.property('isDelivered');
          res.body[0].should.have.property('error');
          res.body[0].should.have.property('deliveredAt');
          res.body[0].should.have.property('killedAt');
        }));
    });
    context('error', () => {
      it('400: id is not uuid', () =>
        request(app)
          .get('/rfqs/1/status')
          .set('Authorization', `Bearer ${this.getSingleRfqToken}`)
          .expect(400)
          .then(assertErrorFormat)
      );
      it('401: no auth header provided', () =>
        request(app)
          .get(`/rfqs/${this.rfq.id}/status`)
          .set('Content-Type', 'application/json')
          .expect(401)
          .then(assertErrorFormat)
      );
      it('403: userType forbidden', () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: 'noAccess', userId: this.client.id, marketId: this.market.id });
        return request(app)
          .get(`/rfqs/${this.rfq.id}/status`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.noAccessToken}`)
          .expect(403)
          .then(assertErrorFormat);
      });
    });
  });

  describe('GET /rfqs?id=abc&id=def', () => {
    beforeEach(async () => {
      this.authStub.restore();
      this.authStub = this.stub({
        userType: roles.client, userId: this.client.id, marketId: this.market.id
      });
      this.rfqIds = [];
      await Promise.map(new Array(5).fill(this.makeRfq), async (fn) => {
        const rfq = await fn({});
        this.rfqIds.push(rfq.id);
      });
    });

    context('success', () => {
      it('200: returns a list of rfqs when specifying multiple ids in the query string', () =>
        request(app)
          .get(`/rfqs?id=${this.rfqIds[0]}&id=${this.rfqIds[2]}`)
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.should.have.length(2);
            res.body.map(rfq => rfq.id).should.include.members([(this.rfqIds[0], this.rfqIds[2])]);
          }));
      it('200: returns a list of one rfq when specifying a single id in the query string', () =>
        request(app)
          .get('/rfqs')
          .query({ id: this.rfqIds[0] })
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.should.have.length(1);
            res.body[0].id.should.equal(this.rfqIds[0]);
          }));
      it('200: if an id is not found, still returns other rfqs', () =>
        request(app)
          .get(`/rfqs?id=${this.rfqIds[0]}&id=${uuid()}`)
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.should.have.length(1);
            res.body[0].id.should.equal(this.rfqIds[0]);
          }));
      it("200: as a client, it does not return an rfq that doesn't belong to the user", async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: roles.admin });
        const newClient = await makeClient({ marketId: this.market.id });
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: newClient.id, marketId: this.market.id
        });
        const newRfq = await this.makeRfq({});
        return request(app)
          .get(`/rfqs?id=${this.rfqIds[0]}&id=${newRfq.id}`)
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.should.have.length(1);
            res.body[0].id.should.equal(newRfq.id);
          });
      });
      it("200: as a provider, it does not return an rfq that doesn't belong to the user", async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: roles.admin });
        const newProvider = await makeClient({ marketId: this.market.id });
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: newProvider.id, marketId: this.market.id
        });
        return request(app)
          .get('/rfqs')
          .query({ id: this.rfqIds[0] })
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then(res => res.body.should.have.length(0));
      });
      it('200: as a marketAdmin, it does not return an rfq that belongs to another market', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: roles.admin });
        const newMarket = await makeMarket({});
        this.authStub.restore();
        this.authStub = this.stub({ userType: roles.marketAdmin, marketId: newMarket.id });
        return request(app)
          .get('/rfqs')
          .query({ id: this.rfqIds[0] })
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then(res => res.body.should.have.length(0));
      });
      it('200: returns a blank array if all rfqs are not found', () =>
        request(app)
          .get(`/rfqs?id=${uuid()}&${uuid()}`)
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then(res => res.body.should.have.length(0)));
    });

    context('error', () => {
      it('400: an id is not a valid uuid', () =>
        request(app)
          .get('/rfqs')
          .query({ id: 'abc123' })
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(400)
          .then(assertErrorFormat));
      it('400: multiple ids and all are not valid uuid', () =>
        request(app)
          .get('/rfqs?id=abc123&id=def456')
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(400)
          .then(assertErrorFormat));
      it('400: multiple ids and only one is not valid uuid', () =>
        request(app)
          .get(`/rfqs?id=abc123&id=${this.rfqIds[0]}`)
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(400)
          .then(assertErrorFormat));
    });
  });

  describe('GET /rfqs', () => {
    beforeEach(async () => {
      this.newClient = await makeClient({ marketId: this.market.id });
      this.newProvider = await makeProvider({ marketId: this.market.id });

      this.authStub.restore();
      this.authStub = this.stub({
        userType: roles.client, userId: this.client.id, marketId: this.market.id
      });

      await Promise.map(
        new Array(10).fill(this.makeRfq),
        x => x({ lifespan: 36000000 })
      );
    });

    context('success', () => {
      it('200: as a client returns rfqs using genuine client token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.client,
          userId: this.client.id,
          marketId: this.market.id
        });

        const rfqsList = await this.assertGetRfqs({ token: this.validToken, status: 200 });
        rfqsList.body.should.have.length(10);
      });
      it('200: as a client returns only returns rfqs in your market', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.client,
          userId: this.client.id,
          marketId: uuid()
        });
        const rfqsList = await this.assertGetRfqs({ token: this.validToken, status: 200 });
        rfqsList.body.should.have.length(0);
      });
      it('200: as a provider returns only returns rfqs in my request group', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });

        await Promise.map(
          new Array(3).fill(this.makeRfq),
          x => x({ requestGroup: [this.newProvider.id], lifespan: 36000000 })
        );

        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.provider,
          userId: this.newProvider.id,
          marketId: this.market.id
        });
        const rfqsList = await this.assertGetRfqs({
          token: this.validToken,
          offset: 0,
          limit: 100,
          status: 200 });
        rfqsList.body.should.have.length(3);
      });
      it('200: as a superAdmin, I can filter on market id', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userId: uuid() });

        const market = await makeMarket({ token: this.tokenStub });
        const newProvider = await makeProvider({ marketId: market.id });

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.newClient.id, marketId: market.id
        });

        await this.makeRfq({ requestGroup: [newProvider.id], lifespan: 36000000 });

        this.authStub.restore();
        this.authStub = this.stub({ userId: uuid() });

        const rfqsList = await this.assertGetRfqs({
          token: this.tokenStub, query: { marketId: market.id }, status: 200 });
        rfqsList.body.should.have.length(1);
        rfqsList.body.map(rfq => rfq.marketId).should.not.include(this.market.id);
      });
      it('200: as a superAdmin, I can filter on client id', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.newClient.id, marketId: this.market.id
        });

        await this.makeRfq({ lifespan: 36000000 });

        this.authStub.restore();
        this.authStub = this.stub({ userId: uuid() });

        const rfqsList = await this.assertGetRfqs({
          token: this.tokenStub, query: { clientId: this.newClient.id }, status: 200 });
        rfqsList.body.should.have.length(1);
        rfqsList.body.map(rfq => rfq.clientId).should.not.include(this.client.id);
      });
      it('200: as a client returns list of 10 rfqs using default values', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });

        const rfqsList = await this.assertGetRfqs({ status: 200 });
        rfqsList.body.should.have.length(10);
        rfqsList.body[0].should.have.property('id');
        rfqsList.body[0].should.have.property('marketId');
        rfqsList.body[0].should.have.property('clientId');
        rfqsList.body[0].should.have.property('requestGroup');
        rfqsList.body[0].should.have.property('payload');
        rfqsList.body[0].should.have.property('lifespan');
        rfqsList.body[0].should.have.property('createdOn');
        rfqsList.body[0].should.have.property('onBehalfOf');
        rfqsList.body.every(rfq => rfq.clientId === this.client.id).should.equal(true);
      });
      it('200: as a provider returns list of 10 rfqs without the property requestGroup', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: this.provider.id, marketId: this.market.id
        });

        const rfqsList = await this.assertGetRfqs({ status: 200 });
        rfqsList.body.should.have.length(10);
        rfqsList.body[0].should.have.property('id');
        rfqsList.body[0].should.have.property('marketId');
        rfqsList.body[0].should.have.property('clientId');
        rfqsList.body[0].should.not.have.property('requestGroup');
        rfqsList.body[0].should.have.property('payload');
        rfqsList.body[0].should.have.property('lifespan');
        rfqsList.body[0].should.have.property('createdOn');
        rfqsList.body[0].should.not.have.property('onBehalfOf');
        rfqsList.body.every(rfq => rfq.clientId === this.client.id).should.equal(true);
      });
      it('200: as a client it accepts valid offset and limit values', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });

        const rfqsList = await this.assertGetRfqs({
          query: { offset: 2, limit: 5 },
          status: 200
        });
        rfqsList.body.should.have.length(5);
      });
      it('200: as a client it accepts valid offset and limit values and active filters', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
        const expiredRfq = await this.makeRfq({
          lifespan: 3600000
        });
        this.clock = sinon.useFakeTimers(Date.now() + 3600001);

        const rfqsList = await this.assertGetRfqs({
          query: { offset: 0, limit: 100, active: true },
          status: 200
        });
        rfqsList.body.should.have.length(10);
        rfqsList.body.map(rfq => rfq.id).should.not.include(expiredRfq.id);

        this.clock.restore();
      });
      it('200: able to filter using the onBehalfOf property', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });

        const newRfq = await request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(this.createPayload({ onBehalfOf: 'new rfq' }))
          .expect(201)
          .then(res => res.body);

        return request(app)
          .get('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .set('On-Behalf-Of', 'new rfq')
          .expect(200)
          .then((res) => {
            res.body.length.should.equal(1);
            res.body[0].id.should.equal(newRfq.id);
          });
      });
    });

    context('errors', () => {
      it('400: offset below minimum', async () => {
        const rfq = await this.assertGetRfqs({
          query: { offset: -1 },
          status: 400 });
        assertErrorFormat(rfq);
      });
      it('400: offset is float', async () => {
        const rfq = await this.assertGetRfqs({
          query: { offset: 2.5 },
          status: 400 });
        assertErrorFormat(rfq);
      });
      it('400: offset is a string', async () => {
        const rfq = await this.assertGetRfqs({
          query: { offset: 'offset' },
          status: 400 });
        assertErrorFormat(rfq);
      });
      it('400: limit below minimum', async () => {
        const rfq = await this.assertGetRfqs({
          query: { limit: 0 },
          status: 400 });
        assertErrorFormat(rfq);
      });
      it('400: limit above maximum', async () => {
        const rfq = await this.assertGetRfqs({
          query: { limit: -1 },
          status: 400 });
        assertErrorFormat(rfq);
      });
      it('400: limit is float', async () => {
        const rfq = await this.assertGetRfqs({
          query: { limit: 2.5 },
          status: 400 });
        assertErrorFormat(rfq);
      });
      it('400: limit is a string', async () => {
        const rfq = await this.assertGetRfqs({
          query: { limit: 'limit' },
          status: 400 });
        assertErrorFormat(rfq);
      });
      it('400: invalid active value', async () => {
        const rfq = await this.assertGetRfqs({ query: { active: 'yes' }, status: 400 });
        assertErrorFormat(rfq);
      });
      it('401: no auth header', () => request(app)
        .get('/rfqs/')
        .set('Content-Type', 'application/json')
        .expect(401)
        .then(assertErrorFormat));
      it('403: as a clientAdmin, I can\'t filter on market id not my own', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userId: uuid() });

        const market = await makeMarket({ token: this.tokenStub });

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.clientAdmin, marketId: this.market.id
        });

        const rfqsList = await this.assertGetRfqs({
          token: this.tokenStub, query: { marketId: market.id }, status: 403 });
        assertErrorFormat(rfqsList);
      });
    });
  });
});
