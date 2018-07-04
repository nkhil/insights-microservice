const chai = require('chai');
const sinon = require('sinon');
const Promise = require('bluebird');
const request = require('supertest');
const uuid = require('uuid/v4');
const { app } = require('../../src');
const { roles } = require('../../src/config');
const { tokenGenerator, SimpleServer, Helpers } = require('../assets');
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

describe('/quotes', () => {
  before(async () => {
    this.tokenStub = 123;
    this.stub = ({ userType = roles.superAdmin, userId = uuid(), marketId = uuid() }) =>
      sinon.stub(authentication, 'validate').returns(authStub({ userType, userId, marketId }));

    this.assertPostQuote = ({ token = this.tokenStub, payload, status }) => request(app)
      .post('/quotes')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(status)
      .then(res => res);
    this.acceptQuote = ({ id, token = this.tokenStub, updates, status }) => request(app)
      .patch(`/quotes/${id}/accept`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .send(updates)
      .expect(status)
      .then(res => res);
    this.rejectQuote = ({ id, token = this.tokenStub, status }) => request(app)
      .patch(`/quotes/${id}/reject`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .expect(status)
      .then(res => res);
    this.completeQuote = ({ id, token = this.tokenStub, updates, status }) => request(app)
      .patch(`/quotes/${id}/complete`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .send(updates)
      .expect(status)
      .then(res => res);
    this.assertGetQuote = ({ id, token = this.tokenStub, status }) => request(app)
      .get(`/quotes/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(status)
      .then(res => res);
    this.assertGetQuotes = ({ token = this.tokenStub, query = {}, status }) => request(app)
      .get('/quotes')
      .query(query)
      .set('Authorization', `Bearer ${token}`)
      .expect(status)
      .then(res => res);
    this.makeQuote = ({ rfqId, token = this.tokenStub, lifespan = 3600000 }) =>
      request(app)
        .post('/quotes')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${token}`)
        .send({
          rfqId,
          payload: { quote: 'quote' },
          lifespan
        })
        .expect(201)
        .then(res => res.body);
  });

  beforeEach(async () => {
    await clearDatabase();

    if (this.clock) this.clock.restore();

    // ** need superAdmin stub to create market, client, provider ** //
    this.authStub = this.stub({});
    this.market = await makeMarket({
      token: this.makeMarketToken,
      quoteSchema: {
        type: 'object',
        required: ['quote']
      },
      acceptanceSchema: { type: 'object', required: ['name'] },
      completionSchema: { type: 'object', required: ['offercode'] }
    });
    this.client = await makeClient({ marketId: this.market.id, webhookUrl: 'http://localhost:3001' });
    this.provider = await makeProvider({ webhookUrl: 'http://localhost:3001', marketId: this.market.id });

    // ** need client stub to create rfqs ** //
    this.authStub.restore();
    this.authStub = this.stub({
      userType: roles.client, userId: this.client.id, marketId: this.market.id
    });
    this.rfq = await request(app)
      .post('/rfqs')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${this.tokenStub}`)
      .send({
        payload: { rfq: 'rfq' },
        requestGroup: [this.provider.id],
        onBehalfOf: 'obo'
      })
      .expect(201)
      .then(res => res.body);

    // ** reset back to superAdmin ** //
    this.authStub.restore();
    this.authStub = this.stub({});
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

      it('201: creates a quote using genuine provider token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.provider,
          userId: this.provider.id,
          marketId: this.market.id
        });
        const postResponse = await this.assertPostQuote({
          token: this.validToken,
          payload: {
            rfqId: this.rfq.id,
            payload: { quote: 'quote' },
            lifespan: 3600000
          },
          status: 201
        });
        postResponse.body.should.have.property('id');
        postResponse.body.should.have.property('revisionId');
        postResponse.body.rfqId.should.equal(this.rfq.id);
        postResponse.body.marketId.should.equal(this.market.id);
        postResponse.body.clientId.should.equal(this.client.id);
        postResponse.body.providerId.should.equal(this.provider.id);
        postResponse.body.payload.should.eql({ quote: 'quote' });
        postResponse.body.lifespan.should.equal(3600000);
        postResponse.body.status.should.equal('pending');
        postResponse.body.acceptance.should.eql({});
        postResponse.body.completion.should.eql({});
      });

      it('201: creates a quote from a valid payload', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: this.provider.id, marketId: this.market.id
        });
        const postResponse = await this.assertPostQuote({
          payload: {
            rfqId: this.rfq.id,
            payload: { quote: 'quote' },
            lifespan: 3600000
          },
          status: 201
        });
        postResponse.body.should.have.property('id');
        postResponse.body.should.have.property('revisionId');
        postResponse.body.rfqId.should.equal(this.rfq.id);
        postResponse.body.marketId.should.equal(this.market.id);
        postResponse.body.clientId.should.equal(this.client.id);
        postResponse.body.providerId.should.equal(this.provider.id);
        postResponse.body.payload.should.eql({ quote: 'quote' });
        postResponse.body.lifespan.should.equal(3600000);
        postResponse.body.status.should.equal('pending');
        postResponse.body.acceptance.should.eql({});
        postResponse.body.completion.should.eql({});
      });

      it('201: should send quote to client', (done) => {
        this.server.on('newRequest', (newRequest) => {
          const req = JSON.parse(newRequest.body);
          if (req.type !== 'QUOTE') { return; }
          req.type.should.equal('QUOTE');
          req.event.should.equal('CREATE');
          req.data.rfqId.should.equal(this.rfq.id);
          req.data.marketId.should.equal(this.market.id);
          req.data.clientId.should.equal(this.client.id);
          req.data.providerId.should.equal(this.provider.id);
          req.data.payload.should.eql({ quote: 'quote' });
          req.data.should.have.property('lifespan');
          req.data.status.should.equal('pending');
          req.data.acceptance.should.eql({});
          req.data.completion.should.eql({});
          done();
        });

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: this.provider.id, marketId: this.market.id
        });
        this.assertPostQuote({
          payload: {
            rfqId: this.rfq.id,
            payload: { quote: 'quote' },
            lifespan: 3600000
          },
          status: 201
        });
      });

      it('201: should notify provider if quote is not delivered', async () => {
        const otherProvider = await makeProvider({ webhookUrl: 'http://localhost:3001', marketId: this.market.id });
        const otherClient = await makeClient({ webhookUrl: 'NO URL', marketId: this.market.id });

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: otherClient.id, marketId: this.market.id
        });

        const rfq = await request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send({
            payload: { rfq: 'rfq' },
            requestGroup: [otherProvider.id],
            onBehalfOf: 'obo'
          })
          .expect(201)
          .then(res => res.body);

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: otherProvider.id, marketId: this.market.id
        });

        const quote = await this.assertPostQuote({
          payload: {
            rfqId: rfq.id,
            payload: { quote: 'quote' },
            lifespan: 3600000
          },
          status: 201
        });

        return new Promise((resolve) => {
          this.server.on('newRequest', (newRequest) => {
            const req = JSON.parse(newRequest.body);
            if (req.type !== 'QUOTE') { return; }
            if (req.event !== 'DELIVERY FAIL') { return; }
            req.type.should.equal('QUOTE');
            req.event.should.equal('DELIVERY FAIL');
            req.data.id.should.equal(quote.body.id);
            req.data.clientId.should.equal(quote.body.clientId);
            resolve();
          });
        });
      });
    });

    context('errors', () => {
      beforeEach(() => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: this.provider.id, marketId: this.market.id
        });
      });

      it('400: no rfqId', async () => {
        const postResponse = await this.assertPostQuote({
          payload: {
            payload: { quote: 'quote' },
            lifespan: 3600000
          },
          status: 400
        });
        assertErrorFormat(postResponse);
      });
      it('400: no payload', async () => {
        const postResponse = await this.assertPostQuote({
          payload: {
            rfqId: this.rfq.id,
            lifespan: 3600000
          },
          status: 400
        });
        assertErrorFormat(postResponse);
      });
      it('400: no lifespan', async () => {
        const postResponse = await this.assertPostQuote({
          payload: {
            rfqId: this.rfq.id,
            payload: { quote: 'quote' }
          },
          status: 400
        });
        assertErrorFormat(postResponse);
      });
      it('400: invalid lifespan format', async () => {
        const postResponse = await this.assertPostQuote({
          payload: {
            rfqId: this.rfq.id,
            payload: { quote: 'quote' },
            lifespan: 'hello'
          },
          status: 400
        });
        assertErrorFormat(postResponse);
      });
      it('400: lifespan below the minimum', async () => {
        const postResponse = await this.assertPostQuote({
          payload: {
            rfqId: this.rfq.id,
            payload: { quote: 'quote' },
            lifespan: 3599999
          },
          status: 400
        });
        assertErrorFormat(postResponse);
      });
      it('400: rfqId is not uuid', async () => {
        const postResponse = await this.assertPostQuote({
          payload: {
            rfqId: 'hello',
            payload: { quote: 'quote' },
            lifespan: 3600000
          },
          status: 400
        });
        assertErrorFormat(postResponse);
      });
      it('400: payload is not object', async () => {
        const postResponse = await this.assertPostQuote({
          payload: {
            rfqId: this.rfq.id,
            payload: 'not an object',
            lifespan: 3600000
          },
          status: 400
        });
        assertErrorFormat(postResponse);
      });
      it('400: payload does not match markets quote schema', async () => {
        const postResponse = await this.assertPostQuote({
          payload: {
            rfqId: this.rfq.id,
            payload: {},
            lifespan: 3600000
          },
          status: 400
        });
        assertErrorFormat(postResponse);
      });
      it('401: no auth header provided', () => request(app)
        .post('/quotes')
        .set('Content-Type', 'application/json')
        .send({
          rfqId: this.rfq.id,
          payload: { quote: 'quote' },
          lifespan: 3600000
        })
        .expect(401)
        .then(assertErrorFormat));
      it('403: userType not allowed access', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.providerAdmin, userId: uuid(), marketId: this.market.id
        });
        const postResponse = await this.assertPostQuote({
          payload: {
            rfqId: this.rfq.id,
            payload: {},
            lifespan: 3600000
          },
          status: 403
        });
        assertErrorFormat(postResponse);
      });
      it('404: rfq is not found', async () => {
        const postResponse = await this.assertPostQuote({
          payload: {
            rfqId: uuid(),
            payload: {},
            lifespan: 3600000
          },
          status: 404
        });
        assertErrorFormat(postResponse);
      });
      it('404: market is inactive', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: roles.superAdmin, userId: uuid(), marketId: uuid() });
        await request(app)
          .patch(`/markets/${this.market.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send({ isActive: false })
          .expect(200);

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: this.provider.id, marketId: this.market.id
        });
        const postResponse = await this.assertPostQuote({
          payload: {
            rfqId: this.rfq.id,
            payload: {},
            lifespan: 3600000
          },
          status: 404
        });
        assertErrorFormat(postResponse);
      });
      it('410: quote on expired rfq', async () => {
        this.clock = sinon.useFakeTimers(Date.now() + 86500000);
        const postResponse = await this.assertPostQuote({
          payload: {
            rfqId: this.rfq.id,
            payload: { quote: 'quote' },
            lifespan: 3600000
          },
          status: 410
        });
        assertErrorFormat(postResponse);
        this.clock.restore();
      });
    });
  });

  describe('/quotes GET/:id', () => {
    beforeEach(async () => {
      this.authStub.restore();
      this.authStub = this.stub({
        userType: roles.provider,
        userId: this.provider.id,
        marketId: this.market.id
      });
      this.quote = await this.makeQuote({ rfqId: this.rfq.id });
    });

    context('success', () => {
      it('200: should return the correct quote using genuine client token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.client,
          userId: this.client.id,
          marketId: this.market.id
        });
        const quote = await this.assertGetQuote({
          id: this.quote.id, status: 200, token: this.validToken
        });
        quote.body.id.should.equal(this.quote.id);
        quote.body.payload.should.eql(this.quote.payload);
        quote.body.lifespan.should.equal(3600000);
      });
      it('200: should return the correct quote if given a valid id', async () => {
        const quote = await this.assertGetQuote({ id: this.quote.id, status: 200 });
        quote.body.id.should.equal(this.quote.id);
        quote.body.payload.should.eql(this.quote.payload);
        quote.body.lifespan.should.equal(3600000);
      });
      it('200: should return the correct quote when also passed the onBehalfOf property', () => request(app)
        .get(`/quotes/${this.quote.id}`)
        .set('Authorization', `Bearer ${this.tokenStub}`)
        .set('Content-Type', 'application/json')
        .set('On-Behalf-Of', 'obo')
        .expect(200)
        .then(res => res.body.id.should.equal(this.quote.id)));
    });

    context('error', () => {
      it('400: quoteId not uuid', async () => {
        const quote = await this.assertGetQuote({ id: 1, status: 400 });
        assertErrorFormat(quote);
      });
      it('401: no auth header', () => request(app)
        .get(`/quotes/${this.quote.id}`)
        .set('Content-Type', 'application/json')
        .expect(401));
      it('403: userType does not have access', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: 'noAccess', userId: uuid(), marketId: this.market.id });
        const quote = await this.assertGetQuote({
          id: this.quote.id,
          status: 403 });
        assertErrorFormat(quote);
      });
      it('403: provider B tries to GET quote from provider A', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: roles.superAdmin, userId: uuid(), marketId: uuid() });
        const otherProvider = await makeProvider({
          webhookUrl: 'http://localhost:3001',
          marketId: this.market.id });

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: otherProvider.id, marketId: this.market.id
        });
        const quote = await this.assertGetQuote({
          id: this.quote.id,
          status: 403 });
        assertErrorFormat(quote);
      });
      it('403: client B tries to GET quote from client A', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: roles.superAdmin, userId: uuid(), marketId: uuid() });
        const otherClient = await makeClient({
          webhookUrl: 'http://localhost:3001',
          marketId: this.market.id });

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: otherClient.id, marketId: this.market.id
        });
        const quote = await this.assertGetQuote({
          id: this.quote.id,
          status: 403 });
        assertErrorFormat(quote);
      });
      it('403: non superAdmin/admin trying to get quote outside of their market', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.clientAdmin, userId: uuid(), marketId: uuid()
        });
        const quote = await this.assertGetQuote({
          id: this.quote.id,
          status: 403 });
        assertErrorFormat(quote);
      });
      it('404: quote does not exist', async () => {
        const quote = await this.assertGetQuote({ id: uuid(), status: 404 });
        assertErrorFormat(quote);
      });
      it('404: onBehalfOf property does not match the header', () => request(app)
        .get(`/quotes/${this.quote.id}`)
        .set('Authorization', `Bearer ${this.tokenStub}`)
        .set('Content-Type', 'application/json')
        .set('On-Behalf-Of', 'no one')
        .expect(404)
        .then(assertErrorFormat));
    });
  });

  describe('GET /quotes', () => {
    beforeEach(async () => {
      this.newClient = await makeClient({ marketId: this.market.id });
      this.newProvider = await makeProvider({ marketId: this.market.id });

      this.authStub.restore();
      this.authStub = this.stub({
        userType: roles.client, userId: this.client.id, marketId: this.market.id
      });
      this.newRfq = await request(app)
        .post('/rfqs')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${this.tokenStub}`)
        .send({
          payload: { rfq: 'rfq' },
          requestGroup: [this.provider.id, this.newProvider.id],
          onBehalfOf: 'obo'
        })
        .expect(201)
        .then(res => res.body);

      this.authStub.restore();
      this.authStub = this.stub({
        userType: roles.provider, userId: this.provider.id, marketId: this.market.id
      });
      await Promise.map(
        new Array(10).fill(this.makeQuote),
        x => x({ rfqId: this.rfq.id, lifespan: 36000000 })
      );
    });

    context('success', () => {
      it('200: as a client returns quotes using genuine client token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.client,
          userId: this.client.id,
          marketId: this.market.id
        });

        const quotesList = await this.assertGetQuotes({ token: this.validToken, status: 200 });
        quotesList.body.should.have.length(10);
      });
      it('200: as a superAdmin, I can filter on market id', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userId: uuid() });

        const market = await makeMarket({ token: this.tokenStub });

        const quotesList = await this.assertGetQuotes({
          token: this.tokenStub, query: { marketId: this.market.id }, status: 200 });
        quotesList.body.map(quote => quote.marketId).should.not.include(market.id);
      });
      it('200: as a client returns only returns quotes in your market', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.client,
          userId: this.client.id,
          marketId: uuid()
        });
        const quotesList = await this.assertGetQuotes({ token: this.validToken, status: 200 });
        quotesList.body.should.have.length(0);
      });
      it('200: as a client returns list of 10 quotes using default values', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });

        const quotesList = await this.assertGetQuotes({ status: 200 });
        quotesList.body.should.have.length(10);
        quotesList.body[0].should.have.property('id');
        quotesList.body[0].should.have.property('revisionId');
        quotesList.body[0].should.have.property('rfqId');
        quotesList.body[0].should.have.property('marketId');
        quotesList.body[0].should.have.property('clientId');
        quotesList.body[0].should.have.property('providerId');
        quotesList.body[0].should.have.property('payload');
        quotesList.body[0].should.have.property('lifespan');
        quotesList.body[0].should.have.property('acceptance');
        quotesList.body[0].should.have.property('completion');
        quotesList.body[0].should.have.property('status');
        quotesList.body.every(quote => quote.clientId === this.client.id).should.equal(true);
      });
      it('200: as a client, it filters quotes by rfqId', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });

        const quotesList = await this.assertGetQuotes({
          query: { rfqId: this.rfq.id },
          status: 200
        });

        quotesList.body.should.have.length(10);
        quotesList.body[0].should.have.property('id');
        quotesList.body[0].should.have.property('revisionId');
        quotesList.body[0].should.have.property('rfqId');
        quotesList.body[0].should.have.property('marketId');
        quotesList.body[0].should.have.property('clientId');
        quotesList.body[0].should.have.property('providerId');
        quotesList.body[0].should.have.property('payload');
        quotesList.body[0].should.have.property('lifespan');
        quotesList.body[0].should.have.property('acceptance');
        quotesList.body[0].should.have.property('completion');
        quotesList.body[0].should.have.property('status');
        quotesList.body.every(quote => quote.clientId === this.client.id).should.equal(true);
        quotesList.body.every(quote => quote.rfqId === this.rfq.id).should.equal(true);
      });
      it('200: as a client, it returns empty array when querying on foreign rfqs', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });

        const quotesList = await this.assertGetQuotes({
          query: { rfqId: this.newRfq.id },
          status: 200
        });
        quotesList.body.should.have.length(0);
      });
      it('200: as a provider returns list of 10 quotes using default values', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: this.provider.id, marketId: this.market.id
        });

        const quotesList = await this.assertGetQuotes({ token: this.provider.token, status: 200 });
        quotesList.body.should.have.length(10);
        quotesList.body[0].should.have.property('id');
        quotesList.body[0].should.have.property('revisionId');
        quotesList.body[0].should.have.property('rfqId');
        quotesList.body[0].should.have.property('marketId');
        quotesList.body[0].should.have.property('clientId');
        quotesList.body[0].should.have.property('providerId');
        quotesList.body[0].should.have.property('payload');
        quotesList.body[0].should.have.property('lifespan');
        quotesList.body[0].should.have.property('acceptance');
        quotesList.body[0].should.have.property('completion');
        quotesList.body[0].should.have.property('status');
        quotesList.body.every(quote => quote.providerId === this.provider.id).should.equal(true);
      });
      it('200: as a provider, it filters quotes by rfqId', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: this.provider.id, marketId: this.market.id
        });

        await Promise.map(
          new Array(5).fill(this.makeQuote),
          x => x({ rfqId: this.newRfq.id })
        );

        const quotesList = await this.assertGetQuotes({
          query: { rfqId: this.newRfq.id },
          status: 200
        });
        quotesList.body.should.have.length(5);
        quotesList.body[0].should.have.property('id');
        quotesList.body[0].should.have.property('revisionId');
        quotesList.body[0].should.have.property('rfqId');
        quotesList.body[0].should.have.property('marketId');
        quotesList.body[0].should.have.property('clientId');
        quotesList.body[0].should.have.property('providerId');
        quotesList.body[0].should.have.property('payload');
        quotesList.body[0].should.have.property('lifespan');
        quotesList.body[0].should.have.property('acceptance');
        quotesList.body[0].should.have.property('completion');
        quotesList.body[0].should.have.property('status');
        quotesList.body.every(quote => quote.providerId === this.provider.id).should.equal(true);
        quotesList.body.every(quote => quote.rfqId === this.newRfq.id).should.equal(true);
      });
      it('200: as a client it accepts valid offset and limit values', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });

        const quotesList = await this.assertGetQuotes({
          query: { offset: 2, limit: 5 },
          status: 200
        });
        quotesList.body.should.have.length(5);
      });
      it('200: as a provider it accepts valid offset and limit values', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: this.provider.id, marketId: this.market.id
        });

        const quotesList = await this.assertGetQuotes({
          query: { offset: 2, limit: 5 },
          status: 200
        });
        quotesList.body.should.have.length(5);
      });
      it('200: as a client it accepts valid offset and limit values and rfqId filters', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });

        const quotesList = await this.assertGetQuotes({
          query: { offset: 2, limit: 5, rfqId: this.rfq.id },
          status: 200
        });
        quotesList.body.should.have.length(5);
      });
      it('200: as a provider it accepts valid offset and limit values and rfqId filters', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: this.provider.id, marketId: this.market.id
        });

        await Promise.map(
          new Array(5).fill(this.makeQuote),
          x => x({ rfqId: this.newRfq.id, lifespan: 36000000 })
        );

        const quotesList = await this.assertGetQuotes({
          query: { offset: 2, limit: 5, rfqId: this.newRfq.id },
          status: 200
        });
        quotesList.body.should.have.length(3);
      });
      it('200: as a client it accepts valid offset and limit values and rfqId filters and active filters', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: this.provider.id, marketId: this.market.id
        });
        const expiredQuote = await this.makeQuote({
          rfqId: this.rfq.id,
          lifespan: 3600000
        });
        this.clock = sinon.useFakeTimers(Date.now() + 3600001);

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
        const quotesList = await this.assertGetQuotes({
          query: { offset: 0, limit: 100, rfqId: this.rfq.id, active: true },
          status: 200
        });
        quotesList.body.should.have.length(10);
        quotesList.body.map(quote => quote.id).should.not.include(expiredQuote.id);

        this.clock.restore();
      });
      it('200: as a provider it accepts valid offset and limit values and rfqId and active filters', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: this.provider.id, marketId: this.market.id
        });

        const expiredQuote = await this.makeQuote({
          rfqId: this.newRfq.id,
          lifespan: 3600000
        });
        this.clock = sinon.useFakeTimers(Date.now() + 3600001);

        const quotesList = await this.assertGetQuotes({
          query: { offset: 0, limit: 100, rfqId: this.newRfq.id, active: false },
          status: 200
        });
        quotesList.body.should.have.length(1);
        quotesList.body.map(quote => quote.id).should.include(expiredQuote.id);

        this.clock.restore();
      });

      it('200: able to filter based on the onBehalfOf property', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });

        const newRfq = await request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send({
            payload: { rfq: 'rfq' },
            requestGroup: [this.provider.id],
            onBehalfOf: 'em@il.me'
          })
          .expect(201)
          .then(res => res.body);

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: this.provider.id, marketId: this.market.id
        });

        const newQuote = await request(app)
          .post('/quotes')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send({
            rfqId: newRfq.id,
            payload: { quote: 'quote' },
            lifespan: 86400000
          })
          .expect(201)
          .then(res => res.body);

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });

        return request(app)
          .get('/quotes')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .set('On-Behalf-Of', 'em@il.me')
          .expect(200)
          .then((res) => {
            res.body.length.should.equal(1);
            res.body[0].id.should.equal(newQuote.id);
          });
      });
    });

    context('errors', () => {
      it('400: invalid offset', async () => {
        const quote = await this.assertGetQuotes({
          query: { offset: -1 },
          status: 400 });
        assertErrorFormat(quote);
      });
      it('400: invalid limit', async () => {
        const quote = await this.assertGetQuotes({
          query: { limit: 0 },
          status: 400 });
        assertErrorFormat(quote);
      });
      it('400: invalid rfqId', async () => {
        const quote = await this.assertGetQuotes({
          query: { rfqId: 1 },
          status: 400 });
        assertErrorFormat(quote);
      });
      it('400: rfqId is empty string', async () => {
        const quote = await this.assertGetQuotes({
          query: { rfqId: '' },
          status: 400 });
        assertErrorFormat(quote);
      });
      it('400: invalid active value', async () => {
        const quote = await this.assertGetQuotes({ token: this.client.token, query: { active: 'yes' }, status: 400 });
        assertErrorFormat(quote);
      });
      it('401: no auth header', () => request(app)
        .get('/quotes/')
        .set('Content-Type', 'application/json')
        .expect(401));
    });
  });

  describe('GET /quotes?id=abc123&id=def456', () => {
    beforeEach(async () => {
      this.authStub.restore();
      this.authStub = this.stub({
        userType: roles.provider, userId: this.provider.id, marketId: this.market.id
      });
      this.quoteIds = [];
      await Promise.map(new Array(5).fill(this.makeQuote), async (fn) => {
        const quote = await fn({ rfqId: this.rfq.id });
        this.quoteIds.push(quote.id);
      });
    });

    context('success', () => {
      it('200: returns a list of quotes when specifying multiple ids in the query string', () =>
        request(app)
          .get(`/quotes?id=${this.quoteIds[0]}&id=${this.quoteIds[2]}`)
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.should.have.length(2);
            res.body.map(quote => quote.id).should
              .include.members([(this.quoteIds[0], this.quoteIds[2])]);
          }));
      it('200: returns a list of one quote when specifying a single id in the query string', () =>
        request(app)
          .get('/quotes')
          .query({ id: this.quoteIds[0] })
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.should.have.length(1);
            res.body[0].id.should.equal(this.quoteIds[0]);
          }));
      it('200: if an id is not found, still returns other quotes', () =>
        request(app)
          .get(`/quotes?id=${uuid()}&id=${this.quoteIds[0]}`)
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then((res) => {
            res.body.should.have.length(1);
            res.body[0].id.should.equal(this.quoteIds[0]);
          }));
      it('200: as a provider, does not return quotes belonging to another user', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: roles.admin });
        const newProvider = await makeProvider({ marketId: this.market.id });
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: newProvider.id, marketId: this.market.id
        });
        return request(app)
          .get('/quotes')
          .query({ id: this.quoteIds[0] })
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then(res => res.body.should.have.length(0));
      });
      it('200: as a client, does not return quotes belonging to another user', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: roles.admin });
        const newClient = await makeClient({ marketId: this.market.id });
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: newClient.id, marketId: this.market.id
        });
        return request(app)
          .get('/quotes')
          .query({ id: this.quoteIds[0] })
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then(res => res.body.should.have.length(0));
      });
      it('200: as a marketAdmin, one of the quotes belongs to a different market', async () => {
        this.authStub.restore();
        this.authStub = this.stub({ userType: roles.admin });
        const newMarket = await makeMarket({});
        this.authStub.restore();
        this.authStub = this.stub({ userType: roles.marketAdmin, marketId: newMarket.id });
        return request(app)
          .get('/quotes')
          .query({ id: this.quoteIds[0] })
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then(res => res.body.should.have.length(0));
      });
      it('200: returns a blank array if all quotes are not found', () =>
        request(app)
          .get(`/quotes?id=${uuid()}&${uuid()}`)
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(200)
          .then(res => res.body.should.have.length(0)));
    });

    context('error', () => {
      it('400: a single id is not a valid uuid', () =>
        request(app)
          .get('/quotes')
          .query({ id: 'abc123' })
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(400)
          .then(assertErrorFormat));
      it('400: multiple ids, all are not valid uuids', () =>
        request(app)
          .get('/quotes?id=abc123&id=def456')
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(400)
          .then(assertErrorFormat));
      it('400: multiple ids, one of which is not a valid uuid', () =>
        request(app)
          .get(`/quotes?id=${this.quoteIds[0]}&id=abc123`)
          .set('Authorization', `Bearer ${this.validToken}`)
          .expect(400)
          .then(assertErrorFormat));
    });
  });

  describe('PATCH /quote/:id/accept', () => {
    beforeEach(async () => {
      this.authStub.restore();
      this.authStub = this.stub({
        userType: roles.provider, userId: this.provider.id, marketId: this.market.id
      });
      this.quote = await this.makeQuote({ rfqId: this.rfq.id });
    });
    context('success', () => {
      beforeEach(async () => {
        const responseFn = (req, res) => {
          res.statusCode = 200;
          res.end();
        };
        this.server = new SimpleServer({ responseFn });
        await this.server.start({ port: 3001, host: 'localhost' });

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
      });

      afterEach(async () => {
        await this.server.close();
      });
      it('200: updates a quote using genuine client token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.client,
          userId: this.client.id,
          marketId: this.market.id
        });
        const acceptedQuote = await this.acceptQuote({
          token: this.validToken, id: this.quote.id, updates: { name: 'tom' }, status: 200
        });
        acceptedQuote.body.should.have.property('id');
        acceptedQuote.body.should.have.property('revisionId');
        acceptedQuote.body.should.have.property('rfqId');
        acceptedQuote.body.should.have.property('marketId');
        acceptedQuote.body.should.have.property('clientId');
        acceptedQuote.body.should.have.property('providerId');
        acceptedQuote.body.should.have.property('payload');
        acceptedQuote.body.should.have.property('lifespan');
        acceptedQuote.body.should.have.property('acceptance');
        acceptedQuote.body.should.have.property('completion');
        acceptedQuote.body.status.should.equal('accept');

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
        const quote = await this.assertGetQuote({ id: this.quote.id, status: 200 });
        quote.body.status.should.equal('accept');
      });
      it('200: updates a quote status to accept', async () => {
        const acceptedQuote = await this.acceptQuote({ id: this.quote.id, updates: { name: 'tom' }, status: 200 });
        acceptedQuote.body.should.have.property('id');
        acceptedQuote.body.should.have.property('revisionId');
        acceptedQuote.body.should.have.property('rfqId');
        acceptedQuote.body.should.have.property('marketId');
        acceptedQuote.body.should.have.property('clientId');
        acceptedQuote.body.should.have.property('providerId');
        acceptedQuote.body.should.have.property('payload');
        acceptedQuote.body.should.have.property('lifespan');
        acceptedQuote.body.should.have.property('acceptance');
        acceptedQuote.body.should.have.property('completion');
        acceptedQuote.body.status.should.equal('accept');
        const quote = await this.assertGetQuote({ id: this.quote.id, status: 200 });
        quote.body.status.should.equal('accept');
      });
      it('200: sends accept quote to provider', (done) => {
        this.server.on('newRequest', (newRequest) => {
          const req = JSON.parse(newRequest.body);
          if (req.type !== 'ACCEPT' || req.event !== 'CREATE') { return; }
          req.type.should.equal('ACCEPT');
          req.event.should.equal('CREATE');
          req.data.acceptance.should.eql({ name: 'tom' });
          done();
        });
        this.acceptQuote({ id: this.quote.id, updates: { name: 'tom' }, status: 200 });
      });
      it('200: should notify client if accept is not delivered', async () => {
        this.authStub.restore();
        this.authStub = this.stub({});

        const otherProvider = await makeProvider({ webhookUrl: 'http://localhost:3001', marketId: this.market.id });
        const otherClient = await makeClient({ webhookUrl: 'http://localhost:3001', marketId: this.market.id });

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: otherClient.id, marketId: this.market.id
        });

        const rfq = await request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send({
            payload: { rfq: 'rfq' },
            requestGroup: [otherProvider.id],
            onBehalfOf: 'obo'
          })
          .expect(201)
          .then(res => res.body);

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: otherProvider.id, marketId: this.market.id
        });

        const quote = await this.assertPostQuote({
          payload: {
            rfqId: rfq.id,
            payload: { quote: 'quote' },
            lifespan: 3600000
          },
          status: 201
        });

        this.authStub.restore();
        this.authStub = this.stub({});

        await request(app)
          .patch(`/providers/${otherProvider.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send({ webhookUrl: 'NO URL' })
          .expect(200);

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: otherClient.id, marketId: this.market.id
        });

        await this.acceptQuote({ id: quote.body.id, updates: { name: 'tom' }, status: 200 });

        return new Promise((resolve) => {
          this.server.on('newRequest', (newRequest) => {
            const req = JSON.parse(newRequest.body);
            if (req.type !== 'ACCEPT') { return; }
            req.type.should.equal('ACCEPT');
            req.event.should.equal('DELIVERY FAIL');
            req.data.id.should.equal(quote.body.id);
            req.data.providerId.should.equal(quote.body.providerId);
            resolve();
          });
        });
      });
    });
    context('error', () => {
      beforeEach(() => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
      });
      it('400: payload does not match acceptance schema', async () => {
        const acceptedQuote = await this.acceptQuote({ id: this.quote.id, updates: { noName: 'tom' }, status: 400 });
        assertErrorFormat(acceptedQuote);
      });
      it('400: quoteId not uuid', async () => {
        const acceptedQuote = await this.acceptQuote({ id: 1, updates: { noName: 'tom' }, status: 400 });
        assertErrorFormat(acceptedQuote);
      });
      it('401: no auth header', async () => {
        request(app)
          .patch(`/quotes/${this.quote.id}/accept`)
          .set('Content-Type', 'application/json')
          .send({ name: 'tom' })
          .expect(401)
          .then(assertErrorFormat);
      });
      it('403: userType forbidden', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: this.provider.id, marketId: this.market.id
        });
        const acceptedQuote = await this.acceptQuote({ id: this.quote.id, updates: { noName: 'tom' }, status: 403 });
        assertErrorFormat(acceptedQuote);
      });
      it('404: quote id not found', async () => {
        const acceptedQuote = await this.acceptQuote({ id: uuid(), updates: { noName: 'tom' }, status: 404 });
        assertErrorFormat(acceptedQuote);
      });
      it('409: quote has already been accepted', async () => {
        await this.acceptQuote({ id: this.quote.id, updates: { name: 'tom' }, status: 200 });
        const acceptedQuote = await this.acceptQuote({ id: this.quote.id, updates: { name: 'tom' }, status: 409 });
        assertErrorFormat(acceptedQuote);
      });
      it('410: quote has expired', async () => {
        this.clock = sinon.useFakeTimers(Date.now() + 3600001);
        const acceptedQuote = await this.acceptQuote({ id: this.quote.id, updates: { name: 'tom' }, status: 410 });
        assertErrorFormat(acceptedQuote);
        this.clock.restore();
      });
    });
  });

  describe('PATCH /quote/:id/reject', () => {
    beforeEach(async () => {
      this.authStub.restore();
      this.authStub = this.stub({
        userType: roles.provider, userId: this.provider.id, marketId: this.market.id
      });
      this.quote = await this.makeQuote({ rfqId: this.rfq.id });
    });

    context('success', () => {
      beforeEach(async () => {
        const responseFn = (req, res) => {
          res.statusCode = 200;
          res.end();
        };
        this.server = new SimpleServer({ responseFn });
        await this.server.start({ port: 3001, host: 'localhost' });

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
      });

      afterEach(async () => {
        await this.server.close();
      });

      it('200: updates a quote using genuine client token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.client,
          userId: this.client.id,
          marketId: this.market.id
        });
        const acceptedQuote = await this.rejectQuote({
          token: this.validToken, id: this.quote.id, updates: { name: 'tom' }, status: 200
        });
        acceptedQuote.body.should.have.property('id');
        acceptedQuote.body.should.have.property('revisionId');
        acceptedQuote.body.should.have.property('rfqId');
        acceptedQuote.body.should.have.property('marketId');
        acceptedQuote.body.should.have.property('clientId');
        acceptedQuote.body.should.have.property('providerId');
        acceptedQuote.body.should.have.property('payload');
        acceptedQuote.body.should.have.property('lifespan');
        acceptedQuote.body.should.have.property('acceptance');
        acceptedQuote.body.should.have.property('completion');
        acceptedQuote.body.status.should.equal('reject');

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
        const quote = await this.assertGetQuote({ id: this.quote.id, status: 200 });
        quote.body.status.should.equal('reject');
      });
      it('200: updates a quote status to reject', async () => {
        const rejectedQuote = await this.rejectQuote({ id: this.quote.id, status: 200 });
        rejectedQuote.body.should.have.property('id');
        rejectedQuote.body.should.have.property('revisionId');
        rejectedQuote.body.should.have.property('rfqId');
        rejectedQuote.body.should.have.property('marketId');
        rejectedQuote.body.should.have.property('clientId');
        rejectedQuote.body.should.have.property('providerId');
        rejectedQuote.body.should.have.property('payload');
        rejectedQuote.body.should.have.property('lifespan');
        rejectedQuote.body.should.have.property('acceptance');
        rejectedQuote.body.should.have.property('completion');
        rejectedQuote.body.status.should.equal('reject');
        const quote = await this.assertGetQuote({ id: this.quote.id, status: 200 });
        quote.body.status.should.equal('reject');
      });
      it('200: sends reject quote to provider', (done) => {
        this.server.on('newRequest', (newRequest) => {
          const req = JSON.parse(newRequest.body);
          if (req.type !== 'REJECT' || req.event !== 'CREATE') { return; }
          req.type.should.equal('REJECT');
          req.event.should.equal('CREATE');
          req.data.acceptance.should.eql({});
          done();
        });
        this.rejectQuote({ id: this.quote.id, status: 200 });
      });
      it('200: should notify client if reject is not delivered', async () => {
        this.authStub.restore();
        this.authStub = this.stub({});

        const otherProvider = await makeProvider({ webhookUrl: 'http://localhost:3001', marketId: this.market.id });
        const otherClient = await makeClient({ webhookUrl: 'http://localhost:3001', marketId: this.market.id });

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: otherClient.id, marketId: this.market.id
        });

        const rfq = await request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send({
            payload: { rfq: 'rfq' },
            requestGroup: [otherProvider.id],
            onBehalfOf: 'obo'
          })
          .expect(201)
          .then(res => res.body);

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: otherProvider.id, marketId: this.market.id
        });

        const quote = await this.assertPostQuote({
          payload: {
            rfqId: rfq.id,
            payload: { quote: 'quote' },
            lifespan: 3600000
          },
          status: 201
        });

        this.authStub.restore();
        this.authStub = this.stub({});

        await request(app)
          .patch(`/providers/${otherProvider.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send({ webhookUrl: 'NO URL' })
          .expect(200);

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: otherClient.id, marketId: this.market.id
        });

        await this.rejectQuote({ id: quote.body.id, status: 200 });

        return new Promise((resolve) => {
          this.server.on('newRequest', (newRequest) => {
            const req = JSON.parse(newRequest.body);
            if (req.type !== 'REJECT') { return; }
            req.type.should.equal('REJECT');
            req.event.should.equal('DELIVERY FAIL');
            req.data.id.should.equal(quote.body.id);
            req.data.providerId.should.equal(quote.body.providerId);
            resolve();
          });
        });
      });
    });
    context('error', () => {
      beforeEach(() => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: this.client.id, marketId: this.market.id
        });
      });

      it('400: quoteId not uuid', async () => {
        const rejectedQuote = await this.rejectQuote({ id: 1, status: 400 });
        assertErrorFormat(rejectedQuote);
      });
      it('401: no auth header', async () => {
        request(app)
          .patch(`/quotes/${this.quote.id}/reject`)
          .set('Content-Type', 'application/json')
          .expect(401)
          .then(assertErrorFormat);
      });
      it('403: no access token', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: this.client.id, marketId: this.market.id
        });

        const rejectedQuote = await this.rejectQuote({
          id: this.quote.id,
          status: 403,
          token: this.noAccessToken });
        assertErrorFormat(rejectedQuote);
      });
      it('404: quote id not found', async () => {
        const rejectedQuote = await this.rejectQuote({ id: uuid(), status: 404 });
        assertErrorFormat(rejectedQuote);
      });
      it('409: quote has already been accepted', async () => {
        await this.acceptQuote({ id: this.quote.id, updates: { name: 'tom' }, status: 200 });
        const rejectedQuote = await this.rejectQuote({ id: this.quote.id, status: 409 });
        assertErrorFormat(rejectedQuote);
      });
      it('410: quote has expired', async () => {
        this.clock = sinon.useFakeTimers(Date.now() + 3600001);
        const rejectedQuote = await this.rejectQuote({ id: this.quote.id, status: 410 });
        assertErrorFormat(rejectedQuote);
        this.clock.restore();
      });
    });
  });

  describe('PATCH /quote/:id/complete', () => {
    beforeEach(async () => {
      this.authStub.restore();
      this.authStub = this.stub({
        userType: roles.provider, userId: this.provider.id, marketId: this.market.id
      });
      this.quote = await this.makeQuote({ rfqId: this.rfq.id });

      this.authStub.restore();
      this.authStub = this.stub({
        userType: roles.client, userId: this.client.id, marketId: this.market.id
      });
      await this.acceptQuote({ id: this.quote.id, updates: { name: 'tom' }, status: 200 });
    });

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

      it('200: complete a quote using genuine provider token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.provider,
          userId: this.provider.id,
          marketId: this.market.id
        });
        const completedQuote = await this.completeQuote({ token: this.validToken, id: this.quote.id, updates: { offercode: '123' }, status: 200 });
        completedQuote.body.should.have.property('id');
        completedQuote.body.should.have.property('revisionId');
        completedQuote.body.should.have.property('rfqId');
        completedQuote.body.should.have.property('marketId');
        completedQuote.body.should.have.property('clientId');
        completedQuote.body.should.have.property('providerId');
        completedQuote.body.should.have.property('payload');
        completedQuote.body.should.have.property('lifespan');
        completedQuote.body.should.have.property('acceptance');
        completedQuote.body.should.have.property('completion');
        completedQuote.body.status.should.equal('complete');

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: this.provider.id, marketId: this.market.id
        });
        const quote = await this.assertGetQuote({ id: this.quote.id, status: 200 });
        quote.body.status.should.equal('complete');
      });
      it('200: update quote status to complete', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: this.provider.id, marketId: this.market.id
        });
        const completedQuote = await this.completeQuote({ id: this.quote.id, updates: { offercode: '123' }, status: 200 });
        completedQuote.body.should.have.property('id');
        completedQuote.body.should.have.property('revisionId');
        completedQuote.body.should.have.property('rfqId');
        completedQuote.body.should.have.property('marketId');
        completedQuote.body.should.have.property('clientId');
        completedQuote.body.should.have.property('providerId');
        completedQuote.body.should.have.property('payload');
        completedQuote.body.should.have.property('lifespan');
        completedQuote.body.should.have.property('acceptance');
        completedQuote.body.should.have.property('completion');
        completedQuote.body.status.should.equal('complete');
        const quote = await this.assertGetQuote({ id: this.quote.id, status: 200 });
        quote.body.status.should.equal('complete');
      });
      it('200: sends complete quote to client', (done) => {
        this.server.on('newRequest', (newRequest) => {
          const req = JSON.parse(newRequest.body);
          if (req.type !== 'COMPLETE' || req.event !== 'CREATE') { return; }
          req.type.should.equal('COMPLETE');
          req.event.should.equal('CREATE');
          req.data.completion.should.eql({ offercode: '123' });
          done();
        });

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: this.provider.id, marketId: this.market.id
        });
        this.completeQuote({ id: this.quote.id, updates: { offercode: '123' }, status: 200 });
      });
      it('200: should notify provider if complete is not delivered', async () => {
        this.authStub.restore();
        this.authStub = this.stub({});

        const otherProvider = await makeProvider({ webhookUrl: 'http://localhost:3001', marketId: this.market.id });
        const otherClient = await makeClient({ webhookUrl: 'http://localhost:3001', marketId: this.market.id });

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: otherClient.id, marketId: this.market.id
        });

        const rfq = await request(app)
          .post('/rfqs')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send({
            payload: { rfq: 'rfq' },
            requestGroup: [otherProvider.id],
            onBehalfOf: 'obo'
          })
          .expect(201)
          .then(res => res.body);

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: otherProvider.id, marketId: this.market.id
        });

        const quote = await this.assertPostQuote({
          payload: {
            rfqId: rfq.id,
            payload: { quote: 'quote' },
            lifespan: 3600000
          },
          status: 201
        });

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.client, userId: otherClient.id, marketId: this.market.id
        });

        await this.acceptQuote({ id: quote.body.id, updates: { name: 'tom' }, status: 200 });

        this.authStub.restore();
        this.authStub = this.stub({});

        await request(app)
          .patch(`/clients/${otherClient.id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send({ webhookUrl: 'NO URL' })
          .expect(200);

        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: otherProvider.id, marketId: this.market.id
        });

        await this.completeQuote({ id: quote.body.id, updates: { offercode: '123' }, status: 200 });

        return new Promise((resolve) => {
          this.server.on('newRequest', (newRequest) => {
            const req = JSON.parse(newRequest.body);
            if (req.type !== 'COMPLETE') { return; }
            req.type.should.equal('COMPLETE');
            req.event.should.equal('DELIVERY FAIL');
            req.data.id.should.equal(quote.body.id);
            req.data.clientId.should.equal(quote.body.clientId);
            resolve();
          });
        });
      });
    });

    context('error', () => {
      beforeEach(() => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: roles.provider, userId: this.provider.id, marketId: this.market.id
        });
      });

      it('400: payload does not match completion schema', async () => {
        const completedQuote = await this.completeQuote({ id: this.quote.id, updates: { offer: '123' }, status: 400 });
        assertErrorFormat(completedQuote);
      });
      it('400: quoteId not uuid', async () => {
        const completedQuote = await this.completeQuote({ id: 1, updates: { offercode: '123' }, status: 400 });
        assertErrorFormat(completedQuote);
      });
      it('401: no auth header', async () => {
        request(app)
          .patch(`/quotes/${this.quote.id}/complete`)
          .set('Content-Type', 'application/json')
          .send({ offercode: '123' })
          .expect(401)
          .then(assertErrorFormat);
      });
      it('403: userType forbidden', async () => {
        this.authStub.restore();
        this.authStub = this.stub({
          userType: 'noAccess', userId: this.client.id, marketId: this.market.id
        });
        const completedQuote = await this.rejectQuote({
          id: this.quote.id,
          status: 403,
          token: this.noAccessToken });
        assertErrorFormat(completedQuote);
      });
      it('404: quote id not found', async () => {
        const completedQuote = await this.completeQuote({ id: uuid(), updates: { offercode: '123' }, status: 404 });
        assertErrorFormat(completedQuote);
      });
      it('409: quote already accepted', async () => {
        await this.completeQuote({ id: this.quote.id, updates: { offercode: '123' }, status: 200 });
        const completedQuote = await this.completeQuote({ id: this.quote.id, updates: { offercode: '123' }, status: 409 });
        assertErrorFormat(completedQuote);
      });
    });
  });
});
