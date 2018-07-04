const chai = require('chai');
const Promise = require('bluebird');
const request = require('supertest');
const sinon = require('sinon');
const uuid = require('uuid/v4');
const { app } = require('../../src');
const { SimpleServer } = require('../assets');
const { Helpers } = require('../assets');
const { authentication } = require('../../src/authentication');

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

describe('/declines', () => {
  before(async () => {
    this.stub = ({ userType = 'superAdmin', userId = uuid(), marketId = uuid() }) =>
      sinon.stub(authentication, 'validate').returns(authStub({ userType, userId, marketId }));
    this.authStub = this.stub({});
    this.assertPostDecline = ({ token = this.authStub, payload, status }) => request(app)
      .post('/declines')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(status)
      .then(res => res);
    this.assertGetDecline = ({ id, token = this.authStub, status }) => request(app)
      .get(`/declines/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(status)
      .then(res => res);
    this.assertGetDeclines = ({ token = this.authStub, query = {}, status }) => request(app)
      .get('/declines')
      .query(query)
      .set('Authorization', `Bearer ${token}`)
      .expect(status)
      .then(res => res);
    this.makeDecline = ({ rfqId, token = this.authStub }) => request(app)
      .post('/declines')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .send({
        rfqId,
        reasons: [{ message: 'Amount Too High' }]
      })
      .expect(201)
      .then(res => res.body);
  });
  beforeEach(async () => {
    await clearDatabase();
    this.authStub.restore();
    this.authStub = this.stub({});

    this.market = await makeMarket({
      quoteSchema: {
        type: 'object',
        required: ['quote']
      },
      acceptanceSchema: { type: 'object', required: ['name'] },
      completionSchema: { type: 'object', required: ['offercode'] }
    });

    this.client = await makeClient({ marketId: this.market.id, webhookUrl: 'http://localhost:3001' });

    this.provider = await makeProvider({
      webhookUrl: 'http://localhost:3001',
      marketId: this.market.id });

    this.authStub.restore();
    this.authStub = this.stub({ userType: 'client', userId: this.client.id, marketId: this.market.id });

    this.rfq = await request(app)
      .post('/rfqs')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${this.client.token}`)
      .send({
        payload: { rfq: 'rfq' },
        requestGroup: [this.provider.id],
        onBehalfOf: 'obo'
      })
      .expect(201)
      .then(res => res.body);

    this.authStub.restore();
    this.authStub = this.stub({ userType: 'provider', userId: this.provider.id, marketId: this.market.id });
  });

  afterEach(() => this.authStub.restore());

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

      it('201: creates a decline from a valid payload', async () => {
        const postResponse = await this.assertPostDecline({
          payload: {
            rfqId: this.rfq.id,
            reasons: [{ message: 'Amount Too High' }]
          },
          status: 201
        });
        postResponse.body.should.have.property('id');
        postResponse.body.rfqId.should.equal(this.rfq.id);
        postResponse.body.marketId.should.equal(this.market.id);
        postResponse.body.clientId.should.equal(this.client.id);
        postResponse.body.providerId.should.equal(this.provider.id);
        postResponse.body.reasons.should.eql([{ message: 'Amount Too High' }]);
      });

      it('201: should send decline to client', (done) => {
        this.server.on('newRequest', (newRequest) => {
          const req = JSON.parse(newRequest.body);
          if (req.type !== 'DECLINE') { return; }
          req.data.should.have.property('id');
          req.data.rfqId.should.equal(this.rfq.id);
          req.data.marketId.should.equal(this.market.id);
          req.data.clientId.should.equal(this.client.id);
          req.data.providerId.should.equal(this.provider.id);
          req.data.reasons.should.eql([{ message: 'Amount Too High' }]);
          done();
        });
        this.assertPostDecline({
          payload: {
            rfqId: this.rfq.id,
            reasons: [{ message: 'Amount Too High' }]
          },
          status: 201
        });
      });
    });

    context('errors', () => {
      it('400: no rfqId', async () => {
        const postResponse = await this.assertPostDecline({
          payload: {
            reasons: [{ message: 'Amount Too High' }]
          },
          status: 400
        });
        assertErrorFormat(postResponse);
      });
      it('400: no reasons', async () => {
        const postResponse = await this.assertPostDecline({
          payload: {
            rfqId: this.rfq.id
          },
          status: 400
        });
        assertErrorFormat(postResponse);
      });
      it('400: rfqId is not uuid', async () => {
        const postResponse = await this.assertPostDecline({
          payload: {
            rfqId: 'hello',
            reasons: 'quote'
          },
          status: 400
        });
        assertErrorFormat(postResponse);
      });
      it('401: no auth header provided', () => request(app)
        .post('/declines')
        .set('Content-Type', 'application/json')
        .send({
          rfqId: this.rfq.id,
          reasons: [{ message: 'Amount Too High' }]
        })
        .expect(401)
        .then(assertErrorFormat));
      it('403: token not allowed access', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: 'client', userId: this.client.id, marketId: this.market.id });
        const postResponse = await this.assertPostDecline({
          payload: {
            rfqId: this.rfq.id,
            reasons: [{ message: 'Amount Too High' }]
          },
          status: 403
        });
        assertErrorFormat(postResponse);
      });
      it('404: rfq is not found', async () => {
        const postResponse = await this.assertPostDecline({
          payload: {
            rfqId: uuid(),
            reasons: [{ message: 'Amount Too High' }]
          },
          status: 404
        });
        assertErrorFormat(postResponse);
      });
      it('404: market is inactive', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: 'superAdmin', userId: this.client.id, marketId: this.market.id });
        await request(app)
          .patch(`/markets/${this.market.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', 'Bearer 123')
          .send({ isActive: false })
          .expect(200);
        this.authStub.restore();
        this.authStub = this.stub({ userType: 'provider', userId: this.provider.id, marketId: this.market.id });

        const postResponse = await this.assertPostDecline({
          payload: {
            rfqId: this.rfq.id,
            reasons: [{ message: 'Amount Too High' }]
          },
          status: 404
        });
        assertErrorFormat(postResponse);
      });
      it('410: quote on expired rfq', async () => {
        this.clock = sinon.useFakeTimers(Date.now() + 86500000);
        const postResponse = await this.assertPostDecline({
          payload: {
            rfqId: this.rfq.id,
            reasons: [{ message: 'Amount Too High' }]
          },
          status: 410
        });
        assertErrorFormat(postResponse);
        this.clock.restore();
      });
    });
  });
  describe('/declines GET/:id', () => {
    beforeEach(async () => {
      this.decline = await this.makeDecline({ rfqId: this.rfq.id, token: this.provider.token });
    });
    context('success', () => {
      it('should return the correct decline if given a valid id', async () => {
        const decline = await this.assertGetDecline({ id: this.decline.id, status: 200 });
        decline.body.id.should.equal(this.decline.id);
        decline.body.rfqId.should.equal(this.rfq.id);
        decline.body.marketId.should.equal(this.market.id);
        decline.body.clientId.should.equal(this.client.id);
        decline.body.providerId.should.equal(this.provider.id);
        decline.body.reasons.should.eql(this.decline.reasons);
      });
    });
    context('error', () => {
      it('400: declineID not uuid', async () => {
        const decline = await this.assertGetDecline({ id: 1, status: 400 });
        assertErrorFormat(decline);
      });
      it('401: no auth header', () => request(app)
        .get(`/declines/${this.decline.id}`)
        .set('Content-Type', 'application/json')
        .expect(401));
      it('403: provider B tries to GET decline from provider A', async () => {
        this.authStub.restore();
        this.authStub = this.stub({});
        const otherProvider = await makeProvider({
          webhookUrl: 'http://localhost:3001',
          marketId: this.market.id
        });

        this.authStub.restore();
        this.authStub = this.stub({ userType: 'provider', userId: otherProvider.id, marketId: this.market.id });

        const quote = await this.assertGetDecline({
          id: this.decline.id,
          status: 403
        });
        assertErrorFormat(quote);
      });
      it('404: decline does not exist', async () => {
        const decline = await this.assertGetDecline({ id: uuid(), status: 404 });
        assertErrorFormat(decline);
      });
    });
  });

  describe('GET /declines', () => {
    beforeEach(async () => {
      this.authStub.restore();
      this.authStub = this.stub({});
      this.newClient = await makeClient({ marketId: this.market.id, webhookUrl: 'http://localhost:3001' });
      this.newProvider = await makeProvider({
        webhookUrl: 'http://localhost:3001',
        marketId: this.market.id });

      this.authStub.restore();
      this.authStub = this.stub({ userType: 'client', userId: this.newClient.id, marketId: this.market.id });

      this.newRfq = await request(app)
        .post('/rfqs')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${this.newClient.token}`)
        .send({
          payload: { rfq: 'rfq' },
          requestGroup: [this.provider.id, this.newProvider.id],
          onBehalfOf: 'obo'
        })
        .expect(201)
        .then(res => res.body);

      this.authStub.restore();
      this.authStub = this.stub({ userType: 'provider', userId: this.provider.id, marketId: this.market.id });

      await Promise.map(
        new Array(10).fill(this.makeDecline),
        x => x({ rfqId: this.rfq.id, token: this.provider.token })
      );

      await Promise.map(
        new Array(5).fill(this.makeDecline),
        x => x({ rfqId: this.newRfq.id, token: this.provider.token })
      );

      this.authStub.restore();
      this.authStub = this.stub({ userType: 'provider', userId: this.newProvider.id, marketId: this.market.id });

      await Promise.map(
        new Array(10).fill(this.makeDecline),
        x => x({ rfqId: this.newRfq.id, token: this.newProvider.token })
      );
    });

    context('success', () => {
      it('200: as a client returns list of 10 decline using default values', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: 'client', userId: this.newClient.id, marketId: this.market.id });
        const marketsList = await this.assertGetDeclines({ status: 200 });
        marketsList.body.should.have.length(10);
        marketsList.body[0].should.have.property('id');
        marketsList.body[0].should.have.property('rfqId');
        marketsList.body[0].should.have.property('marketId');
        marketsList.body[0].should.have.property('clientId');
        marketsList.body[0].should.have.property('providerId');
        marketsList.body[0].should.have.property('reasons');
        marketsList.body[0].should.have.property('createdOn');
        marketsList.body.every(
          decline => decline.clientId === this.newClient.id
        ).should.equal(true);
      });
      it('200: as a client, it filters decline by rfqId', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: 'client', userId: this.newClient.id, marketId: this.market.id });
        const marketsList = await this.assertGetDeclines({
          query: { rfqId: this.newRfq.id },
          status: 200
        });
        marketsList.body.should.have.length(10);
        marketsList.body[0].should.have.property('id');
        marketsList.body[0].should.have.property('rfqId');
        marketsList.body[0].should.have.property('marketId');
        marketsList.body[0].should.have.property('clientId');
        marketsList.body[0].should.have.property('providerId');
        marketsList.body[0].should.have.property('reasons');
        marketsList.body[0].should.have.property('createdOn');
        marketsList.body.every(
          decline => decline.clientId === this.newClient.id
        ).should.equal(true);
        marketsList.body.every(decline => decline.rfqId === this.newRfq.id).should.equal(true);
      });
      it('200: as a client, it returns empty array when querying on foreign rfqs', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: 'client', userId: this.newClient.id, marketId: this.market.id });
        const marketsList = await this.assertGetDeclines({
          query: { rfqId: this.rfq.id },
          status: 200
        });
        marketsList.body.should.have.length(0);
      });
      it('200: as a provider returns list of 10 declines using default values', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: 'provider', userId: this.newProvider.id, marketId: this.market.id });
        const marketsList = await this.assertGetDeclines({ status: 200 });
        marketsList.body.should.have.length(10);
        marketsList.body[0].should.have.property('id');
        marketsList.body[0].should.have.property('rfqId');
        marketsList.body[0].should.have.property('marketId');
        marketsList.body[0].should.have.property('clientId');
        marketsList.body[0].should.have.property('providerId');
        marketsList.body[0].should.have.property('reasons');
        marketsList.body[0].should.have.property('createdOn');
        marketsList.body.every(
          decline => decline.providerId === this.newProvider.id
        ).should.equal(true);
      });
      it('200: as a provider, it filters decline by rfqId', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: 'provider', userId: this.newProvider.id, marketId: this.market.id });
        const marketsList = await this.assertGetDeclines({
          query: { rfqId: this.newRfq.id },
          status: 200
        });
        marketsList.body.should.have.length(10);
        marketsList.body[0].should.have.property('id');
        marketsList.body[0].should.have.property('rfqId');
        marketsList.body[0].should.have.property('marketId');
        marketsList.body[0].should.have.property('clientId');
        marketsList.body[0].should.have.property('providerId');
        marketsList.body[0].should.have.property('reasons');
        marketsList.body[0].should.have.property('createdOn');
        marketsList.body.every(
          decline => decline.providerId === this.newProvider.id
        ).should.equal(true);
        marketsList.body.every(decline => decline.rfqId === this.newRfq.id).should.equal(true);
      });
      it('200: as a client it accepts valid offset and limit values', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: 'client', userId: this.newClient.id, marketId: this.market.id });
        const marketsList = await this.assertGetDeclines({
          query: { offset: 2, limit: 5 },
          status: 200
        });
        marketsList.body.should.have.length(5);
      });
      it('200: as a provider it accepts valid offset and limit values', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: 'provider', userId: this.newProvider.id, marketId: this.market.id });
        const marketsList = await this.assertGetDeclines({
          query: { offset: 2, limit: 5 },
          status: 200
        });
        marketsList.body.should.have.length(5);
      });
      it('200: as a client it accepts valid offset and limit values and rfqId filters', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: 'client', userId: this.newClient.id, marketId: this.market.id });
        const marketsList = await this.assertGetDeclines({
          query: { offset: 2, limit: 5, rfqId: this.newRfq.id },
          status: 200
        });
        marketsList.body.should.have.length(5);
      });
      it('200: as a provider it accepts valid offset and limit values and rfqId filters', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: 'provider', userId: this.newProvider.id, marketId: this.market.id });
        const marketsList = await this.assertGetDeclines({
          query: { offset: 2, limit: 5, rfqId: this.newRfq.id },
          status: 200
        });
        marketsList.body.should.have.length(5);
      });
      it('200: as a marketAdmin I can list declines in my market', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: 'marketAdmin', marketId: this.market.id });
        const marketsList = await this.assertGetDeclines({
          query: { marketId: this.market.id },
          status: 200
        });
        marketsList.body.every(market => market.marketId.should.equal(this.market.id));
      });
    });
    context('errors', () => {
      it('400: invalid offset', async () => {
        const decline = await this.assertGetDeclines({
          query: { offset: -1 },
          status: 400 });
        assertErrorFormat(decline);
      });
      it('400: invalid limit', async () => {
        const decline = await this.assertGetDeclines({
          query: { limit: 0 },
          status: 400 });
        assertErrorFormat(decline);
      });
      it('400: invalid rfqId', async () => {
        const decline = await this.assertGetDeclines({
          query: { rfqId: 1 },
          status: 400 });
        assertErrorFormat(decline);
      });
      it('400: invalid marketId', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: 'admin' });
        const decline = await this.assertGetDeclines({
          query: { marketId: 1 },
          status: 400 });
        assertErrorFormat(decline);
      });
      it('401: no auth header', () => request(app)
        .get('/declines/')
        .set('Content-Type', 'application/json')
        .expect(401));
      it('403: userType forbidden', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: 'noAccess', userId: this.client.id, marketId: this.market.id
        });
        const decline = await this.assertGetDeclines({ status: 403 });
        assertErrorFormat(decline);
      });
      it('403: trying to access market not your own', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: 'marketAdmin', marketId: this.market.id });
        const decline = await this.assertGetDeclines({ query: { marketId: uuid() }, status: 403 });
        assertErrorFormat(decline);
      });
    });
  });
});
