const chai = require('chai');
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
  clearDatabase,
  makeMarket
} = Helpers;

chai.should();

/* eslint-disable */
process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise ', p, ' reason: ', reason);
  process.exit(1);
});
/* eslint-enable */

describe('/markets', () => {
  before(async () => {
    this.idNotFound = uuid();
    this.tokenStub = 123;

    this.createPayload = ({
      name = 'testMarket',
      description = 'description',
      imageUrl = 'http://imageurl.com',
      isActive = false,
      rfqDefaultLifespan = 86500000,
      rfqSchema = { rfq: 'rfq' },
      quoteSchema = { quote: 'quote' },
      acceptanceSchema = { accept: 'accept' },
      completionSchema = { complete: 'complete' }
    }) => ({
      name,
      description,
      imageUrl,
      isActive,
      rfqDefaultLifespan,
      rfqSchema,
      quoteSchema,
      acceptanceSchema,
      completionSchema
    });

    this.updateMarket = ({ id, updates }) => request(app)
      .patch(`/markets/${id}`)
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${this.tokenStub}`)
      .send(updates)
      .expect(200)
      .then(res => res.body);
  });

  beforeEach(async () => {
    this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
      userType: roles.superAdmin,
      userId: uuid(),
      marketId: uuid()
    }));
    await clearDatabase();
    this.market = await makeMarket({});

    this.assertGetMarket = ({ token = this.tokenStub, id = this.market.id, status }) =>
      request(app)
        .get(`/markets/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(status)
        .then(res => res);
  });

  afterEach(() => {
    this.authStub.restore();
  });

  describe('POST', () => {
    this.assertPostMarket = ({ token = this.tokenStub, payload, status }) => request(app)
      .post('/markets')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(status)
      .then(res => res);

    context('success', () => {
      it('201: creates a market with minimum, valid payload', async () => {
        const postResponse = await this.assertPostMarket({
          payload: { name: 'test market' },
          status: 201
        });
        postResponse.body.should.have.property('id');
        postResponse.body.should.have.property('revisionId');
        postResponse.body.name.should.equal('test market');
        postResponse.body.should.have.property('description');
        postResponse.body.should.have.property('imageUrl');
        postResponse.body.should.have.property('isActive');
        postResponse.body.should.have.property('lit');
        postResponse.body.should.have.property('rfqDefaultLifespan');
        postResponse.body.should.have.property('rfqCloseOnAccept');
        postResponse.body.should.have.property('rfqSchema');
        postResponse.body.should.have.property('quoteSchema');
        postResponse.body.should.have.property('acceptanceSchema');
        postResponse.body.should.have.property('completionSchema');
        postResponse.body.should.have.property('createdOn');
        postResponse.body.should.have.property('updatedOn');
        postResponse.body.isActive.should.equal(false);
      });

      it('201: creates a market with maximum, valid payload', async () => {
        const payload = this.createPayload({});
        const postResponse = await this.assertPostMarket({
          payload: this.createPayload({}),
          status: 201
        });
        postResponse.body.should.have.property('id');
        postResponse.body.should.have.property('revisionId');
        postResponse.body.name.should.equal(payload.name);
        postResponse.body.description.should.equal(payload.description);
        postResponse.body.imageUrl.should.equal(payload.imageUrl);
        postResponse.body.isActive.should.equal(payload.isActive);
        postResponse.body.lit.should.equal(false);
        postResponse.body.rfqDefaultLifespan.should.equal(payload.rfqDefaultLifespan);
        postResponse.body.rfqCloseOnAccept.should.equal(false);
        postResponse.body.rfqSchema.should.eql(payload.rfqSchema);
        postResponse.body.quoteSchema.should.eql(payload.quoteSchema);
        postResponse.body.acceptanceSchema.should.eql(payload.acceptanceSchema);
        postResponse.body.completionSchema.should.eql(payload.completionSchema);
        postResponse.body.should.have.property('createdOn');
        postResponse.body.should.have.property('updatedOn');
      });

      it('201: creates a market using genuine admin token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.admin
        });
        const postResponse = await this.assertPostMarket({
          token: this.validToken,
          payload: { name: 'test market' },
          status: 201
        });
        postResponse.body.should.have.property('id');
        postResponse.body.should.have.property('revisionId');
        postResponse.body.name.should.equal('test market');
        postResponse.body.should.have.property('description');
        postResponse.body.should.have.property('imageUrl');
        postResponse.body.should.have.property('isActive');
        postResponse.body.should.have.property('lit');
        postResponse.body.should.have.property('rfqDefaultLifespan');
        postResponse.body.should.have.property('rfqCloseOnAccept');
        postResponse.body.should.have.property('rfqSchema');
        postResponse.body.should.have.property('quoteSchema');
        postResponse.body.should.have.property('acceptanceSchema');
        postResponse.body.should.have.property('completionSchema');
        postResponse.body.should.have.property('createdOn');
        postResponse.body.should.have.property('updatedOn');
        postResponse.body.isActive.should.equal(false);
      });
    });

    context('error', () => {
      const status = 400;

      it('400: no name', async () => {
        const postResponse = await this.assertPostMarket({ payload: {}, status });
        assertErrorFormat(postResponse);
      });

      it('400: invalid name format', async () => {
        const postResponse = await this.assertPostMarket({ payload: this.createPayload({ name: '<hello>' }), status });
        assertErrorFormat(postResponse);
      });

      it('400: description is not a string', async () => {
        const postResponse = await this.assertPostMarket({
          payload: this.createPayload({ description: 123 }), status });
        assertErrorFormat(postResponse);
      });

      it('400: imageUrl is not a string', async () => {
        const postResponse = await this.assertPostMarket({
          payload: this.createPayload({ imageUrl: 123 }), status });
        assertErrorFormat(postResponse);
      });

      it('400: description is in invalid format', async () => {
        const postResponse = await this.assertPostMarket({
          payload: this.createPayload({ description: '<html>' }), status });
        assertErrorFormat(postResponse);
      });

      it('400: isActive is not boolean', async () => {
        const postResponse = await this.assertPostMarket({
          payload: this.createPayload({ isActive: 'hello' }), status });
        assertErrorFormat(postResponse);
      });

      it('400: rfqDefaultLifespan is not an integer', async () => {
        const postResponse = await this.assertPostMarket({
          payload: this.createPayload({ rfqDefaultLifespan: 'hello' }), status });
        assertErrorFormat(postResponse);
      });

      it('400: invalid rfq schema', async () => {
        const postResponse = await this.assertPostMarket({
          payload: this.createPayload({ rfqSchema: 123 }), status });
        assertErrorFormat(postResponse);
      });

      it('400: invalid quote schema', async () => {
        const postResponse = await this.assertPostMarket({
          payload: this.createPayload({ quoteSchema: 123 }), status });
        assertErrorFormat(postResponse);
      });

      it('400: invalid acceptance schema', async () => {
        const postResponse = await this.assertPostMarket({
          payload: this.createPayload({ acceptanceSchema: 123 }), status });
        assertErrorFormat(postResponse);
      });

      it('400: invalid completion schema', async () => {
        const postResponse = await this.assertPostMarket({
          payload: this.createPayload({ completionSchema: 123 }), status });
        assertErrorFormat(postResponse);
      });

      it('401: no auth header provided', () =>
        request(app)
          .post('/markets')
          .set('Content-Type', 'application/json')
          .send(this.createPayload({}))
          .expect(401)
          .then(assertErrorFormat));

      it('403: userType does not have access', async () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: uuid(),
          marketId: uuid()
        }));
        const postResponse = await this.assertPostMarket({
          payload: this.createPayload({}), status: 403 });
        assertErrorFormat(postResponse);
      });

      it('409: duplicate market', async () => {
        const name = 'duplicate market';
        await makeMarket({ name, token: this.postToken });
        const postResponse = await this.assertPostMarket({
          payload: { name }, status: 409 });
        assertErrorFormat(postResponse);
      });
    });
  });

  describe('GET', () => {
    this.assertGetMarkets = ({ token = this.tokenStub, query = {}, status }) => request(app)
      .get('/markets')
      .query(query)
      .set('Authorization', `Bearer ${token}`)
      .expect(status)
      .then(res => res);

    beforeEach(async () => {
      await Promise.map(new Array(9).fill(makeMarket), x => x({ token: this.tokenStub }));
    });

    context('success', () => {
      it('200: returns list of markets using default values', async () => {
        const getResponse = await this.assertGetMarkets({ status: 200 });
        getResponse.body.should.have.length(10);
        getResponse.body[0].should.have.property('id');
        getResponse.body[0].should.have.property('revisionId');
        getResponse.body[0].should.have.property('name');
        getResponse.body[0].should.have.property('description');
        getResponse.body[0].should.have.property('imageUrl');
        getResponse.body[0].should.have.property('isActive');
        getResponse.body[0].should.have.property('lit');
        getResponse.body[0].should.have.property('rfqDefaultLifespan');
        getResponse.body[0].should.have.property('rfqCloseOnAccept');
        getResponse.body[0].should.have.property('rfqSchema');
        getResponse.body[0].should.have.property('quoteSchema');
        getResponse.body[0].should.have.property('acceptanceSchema');
        getResponse.body[0].should.have.property('completionSchema');
        getResponse.body[0].should.have.property('createdOn');
        getResponse.body[0].should.have.property('updatedOn');
      });

      it('200: returns a list of markets using the limit query', async () => {
        const getResponse = await this.assertGetMarkets({ query: { limit: 5 }, status: 200 });
        getResponse.body.length.should.equal(5);
      });

      it('200: filter the returned fields', async () => {
        const getResponse = await this.assertGetMarkets({ query: { fields: 'id' }, status: 200 });
        getResponse.body[0].should.have.property('id');
        getResponse.body[0].should.not.have.property('revisionId');
        getResponse.body[0].should.not.have.property('name');
        getResponse.body[0].should.not.have.property('description');
        getResponse.body[0].should.not.have.property('isActive');
        getResponse.body[0].should.not.have.property('lit');
        getResponse.body[0].should.not.have.property('rfqDefaultLifespan');
        getResponse.body[0].should.not.have.property('rfqCloseOnAccept');
        getResponse.body[0].should.not.have.property('rfqSchema');
        getResponse.body[0].should.not.have.property('quoteSchema');
        getResponse.body[0].should.not.have.property('acceptanceSchema');
        getResponse.body[0].should.not.have.property('completionSchema');
        getResponse.body[0].should.not.have.property('createdOn');
        getResponse.body[0].should.not.have.property('updatedOn');
      });

      it('200: returns a list of markets using the offset query', async () => {
        const getResponse = await this.assertGetMarkets({ query: { offset: 2 }, status: 200 });
        getResponse.body.length.should.equal(8);
      });

      it('200: returns list of markets using genuine admin token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.admin
        });
        const getResponse = await this.assertGetMarkets({ token: this.validToken, status: 200 });
        getResponse.body.should.have.length(10);
      });
      it('200: returns your own market when not admin or super admin', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.marketAdmin,
          marketId: this.market.id
        });
        let getResponse = await this.assertGetMarkets({ token: this.validToken, status: 200 });
        getResponse.body[0].id.should.equal(this.market.id);
        getResponse.body.should.have.length(1);

        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.client,
          userId: uuid(),
          marketId: this.market.id
        });
        getResponse = await this.assertGetMarkets({ token: this.validToken, status: 200 });
        getResponse.body[0].id.should.equal(this.market.id);
        getResponse.body.should.have.length(1);

        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.provider,
          userId: uuid(),
          marketId: this.market.id
        });
        getResponse = await this.assertGetMarkets({ token: this.validToken, status: 200 });
        getResponse.body.should.have.length(1);
        getResponse.body[0].id.should.equal(this.market.id);
      });
    });

    context('error', () => {
      const status = 400;
      it('400: negative value for offset', async () => {
        const getResponse = await this.assertGetMarkets({ query: { offset: -1 }, status });
        assertErrorFormat(getResponse);
      });

      it('400: limit is 0', async () => {
        const getResponse = await this.assertGetMarkets({ query: { limit: 0 }, status });
        assertErrorFormat(getResponse);
      });

      it('400: offset is string', async () => {
        const getResponse = await this.assertGetMarkets({ query: { offset: 'abc' }, status });
        assertErrorFormat(getResponse);
      });

      it('400: limit is a string', async () => {
        const getResponse = await this.assertGetMarkets({ query: { limit: 'abc' }, status });
        assertErrorFormat(getResponse);
      });

      it('400: offset and/or limit are floats', async () => {
        const getResponse = await this.assertGetMarkets({
          query: { offset: 0.5, limit: 1.25 }, status });
        assertErrorFormat(getResponse);
      });

      it('401: no auth header provided', () => request(app)
        .get('/markets')
        .expect(401)
        .then(assertErrorFormat));
    });
  });

  describe('GET/:id', () => {
    context('success', () => {
      it('200: returns a specific market', async () => {
        const getRes = await this.assertGetMarket({ status: 200 });
        getRes.body.id.should.equal(this.market.id);
        getRes.body.revisionId.should.equal(this.market.revisionId);
        getRes.body.name.should.equal(this.market.name);
        getRes.body.should.have.property('description');
        getRes.body.should.have.property('imageUrl');
        getRes.body.isActive.should.equal(this.market.isActive);
        getRes.body.lit.should.equal(this.market.lit);
        getRes.body.rfqDefaultLifespan.should.equal(this.market.rfqDefaultLifespan);
        getRes.body.rfqCloseOnAccept.should.equal(this.market.rfqCloseOnAccept);
        getRes.body.rfqSchema.should.eql(this.market.rfqSchema);
        getRes.body.quoteSchema.should.eql(this.market.quoteSchema);
        getRes.body.acceptanceSchema.should.eql(this.market.acceptanceSchema);
        getRes.body.completionSchema.should.eql(this.market.completionSchema);
        getRes.body.createdOn.should.eql(this.market.createdOn);
        getRes.body.updatedOn.should.eql(this.market.updatedOn);
      });
      it('200: returns a specific market using marketAdmin/client/provider token', async () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.marketAdmin,
          marketId: this.market.id
        }));
        let getRes = await this.assertGetMarket({ status: 200 });
        getRes.body.id.should.equal(this.market.id);

        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: uuid(),
          marketId: this.market.id
        }));
        getRes = await this.assertGetMarket({ status: 200 });
        getRes.body.id.should.equal(this.market.id);

        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.provider,
          userId: uuid(),
          marketId: this.market.id
        }));
        getRes = await this.assertGetMarket({ status: 200 });
        getRes.body.id.should.equal(this.market.id);
      });
    });

    context('error', () => {
      it('401: no auth header provided', () => request(app)
        .get(`/markets/${this.market.id}`)
        .expect(401)
        .then(assertErrorFormat));
      it('403: user does not have access to id', async () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.marketAdmin,
          userId: uuid(),
          marketId: uuid()
        }));
        const getRes = await this.assertGetMarket({ id: uuid(), status: 403 });
        assertErrorFormat(getRes);
      });

      it('404: market not found', async () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.marketAdmin,
          userId: uuid(),
          marketId: this.idNotFound
        }));
        const getRes = await this.assertGetMarket({ id: this.idNotFound, status: 404 });
        assertErrorFormat(getRes);
      });
    });
  });

  describe('PATCH/:id', () => {
    beforeEach(async () => {
      this.assertUpdate = ({ id = this.market.id, token = this.tokenStub, updates, status }) =>
        request(app)
          .patch(`/markets/${id}`)
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${token}`)
          .send(updates)
          .expect(status)
          .then(res => res);
    });

    context('success', () => {
      const status = 200;
      it('200: updates market using genuine marketAdmin token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.marketAdmin,
          marketId: this.market.id
        });
        const description = 'update me!';
        await this.assertUpdate({ token: this.validToken, updates: { description }, status });
        const updMarket = await this.assertGetMarket({ token: this.validToken, status: 200 });
        updMarket.body.description.should.equal(description);
        new Date(updMarket.body.updatedOn).should.be.above(new Date(this.market.updatedOn));
      });

      it('200: updates the markets description', async () => {
        const description = 'update me!';
        await this.assertUpdate({ updates: { description }, status });
        const updMarket = await this.assertGetMarket({ status: 200 });
        updMarket.body.description.should.equal(description);
        new Date(updMarket.body.updatedOn).should.be.above(new Date(this.market.updatedOn));
      });

      it('200: updates the market\'s imageUrl', async () => {
        const imageUrl = 'another image url';
        await this.assertUpdate({ updates: { imageUrl }, status });
        const updMarket = await this.assertGetMarket({ status: 200 });
        updMarket.body.imageUrl.should.equal(imageUrl);
        new Date(updMarket.body.updatedOn).should.be.above(new Date(this.market.updatedOn));
      });

      it('200: updates the markets isActive', async () => {
        const isActive = false;
        await this.assertUpdate({ updates: { isActive }, status });
        const updMarket = await this.assertGetMarket({ status: 200 });
        updMarket.body.isActive.should.equal(isActive);
        (new Date(updMarket.body.updatedOn) - new Date(this.market.updatedOn)).should.be.above(0);
      });

      it('200: updates the market rfqDefaultLifespan', async () => {
        const rfqDefaultLifespan = 86500000;
        await this.assertUpdate({ updates: { rfqDefaultLifespan }, status });
        const updMarket = await this.assertGetMarket({ status: 200 });
        updMarket.body.rfqDefaultLifespan.should.equal(rfqDefaultLifespan);
        (new Date(updMarket.body.updatedOn) - new Date(this.market.updatedOn)).should.be.above(0);
      });

      it('200: updates the market rfqSchema', async () => {
        const rfqSchema = { rfq: 'rfq' };
        await this.assertUpdate({ updates: { rfqSchema }, status });
        const updMarket = await this.assertGetMarket({ status: 200 });
        updMarket.body.rfqSchema.should.eql(rfqSchema);
        (new Date(updMarket.body.updatedOn) - new Date(this.market.updatedOn)).should.be.above(0);
      });

      it('200: updates the market quoteSchema', async () => {
        const quoteSchema = { quote: 'quote' };
        await this.assertUpdate({ updates: { quoteSchema }, status });
        const updMarket = await this.assertGetMarket({ status: 200 });
        updMarket.body.quoteSchema.should.eql(quoteSchema);
        (new Date(updMarket.body.updatedOn) - new Date(this.market.updatedOn)).should.be.above(0);
      });

      it('200: updates the market acceptance', async () => {
        const acceptanceSchema = { accept: 'accept' };
        await this.assertUpdate({ updates: { acceptanceSchema }, status });
        const updMarket = await this.assertGetMarket({ status: 200 });
        updMarket.body.acceptanceSchema.should.eql(acceptanceSchema);
        (new Date(updMarket.body.updatedOn) - new Date(this.market.updatedOn)).should.be.above(0);
      });

      it('200: updates the market completion', async () => {
        const completionSchema = { complete: 'complete' };
        await this.assertUpdate({ updates: { completionSchema }, status });
        const updMarket = await this.assertGetMarket({ status: 200 });
        updMarket.body.completionSchema.should.eql(completionSchema);
        (new Date(updMarket.body.updatedOn) - new Date(this.market.updatedOn)).should.be.above(0);
      });
    });

    context('error', () => {
      const status = 400;
      it('400: tries to update the market id', async () => {
        const updRes = await this.assertUpdate({ updates: { id: uuid() }, status });
        assertErrorFormat(updRes);
      });

      it('400: tries to update the market name', async () => {
        const updRes = await this.assertUpdate({ updates: { name: 'hello' }, status });
        assertErrorFormat(updRes);
      });

      it('400: tries to update lit', async () => {
        const updRes = await this.assertUpdate({ updates: { lit: true }, status });
        assertErrorFormat(updRes);
      });

      it('400: tries to update rfqCloseOnAccept', async () => {
        const updRes = await this.assertUpdate({ updates: { rfqCloseOnAccept: true }, status });
        assertErrorFormat(updRes);
      });

      it('400: description is not a string', async () => {
        const updRes = await this.assertUpdate({ updates: { description: 123 }, status });
        assertErrorFormat(updRes);
      });

      it('400: description is not in valid format', async () => {
        const updRes = await this.assertUpdate({ updates: { description: '<html>' }, status });
        assertErrorFormat(updRes);
      });

      it('400: imageUrl is not a string', async () => {
        const updRes = await this.assertUpdate({ updates: { imageUrl: 123 }, status });
        assertErrorFormat(updRes);
      });

      it('400: invalid isActive', async () => {
        const updRes = await this.assertUpdate({ updates: { isActive: 'true' }, status });
        assertErrorFormat(updRes);
      });

      it('400: invalid rfqDefaultLifespan', async () => {
        const updRes = await this.assertUpdate({ updates: { rfqDefaultLifespan: '500000' }, status });
        assertErrorFormat(updRes);
      });

      it('400: invalid rfqSchema', async () => {
        const updRes = await this.assertUpdate({ updates: { rfqSchema: 123 }, status });
        assertErrorFormat(updRes);
      });

      it('400: invalid quoteSchema', async () => {
        const updRes = await this.assertUpdate({ updates: { quoteSchema: 123 }, status });
        assertErrorFormat(updRes);
      });

      it('400: invalid acceptanceSchema', async () => {
        const updRes = await this.assertUpdate({ updates: { acceptanceSchema: 123 }, status });
        assertErrorFormat(updRes);
      });

      it('400: invalid completionSchema', async () => {
        const updRes = await this.assertUpdate({ updates: { completionSchema: 123 }, status });
        assertErrorFormat(updRes);
      });

      it('401: no auth header provided', () => request(app)
        .patch(`/markets/${this.market.id}`)
        .expect(401));

      it('403: userType does not have access', async () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: uuid(),
          marketId: uuid()
        }));
        const updRes = await this.assertUpdate({ updates: { description: 'update' }, status: 403 });
        assertErrorFormat(updRes);
      });

      it('403: user does not have access to the specific market', async () => {
        const newMarket = await makeMarket({});
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.marketAdmin,
          userId: uuid(),
          marketId: uuid()
        }));
        const updRes = await this.assertUpdate({
          id: newMarket.id, updates: { description: 'desc' }, status: 403 });
        assertErrorFormat(updRes);
      });

      it('404: market not found', async () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.marketAdmin,
          userId: uuid(),
          marketId: this.idNotFound
        }));
        const updRes = await this.assertUpdate({
          id: this.idNotFound, updates: { description: 'abc' }, status: 404 });
        assertErrorFormat(updRes);
      });
    });
  });

  describe('DELETE/:id', () => {
    beforeEach(async () => {
      this.assertDelete = ({ id = this.market.id, token = this.tokenStub, status }) =>
        request(app)
          .delete(`/markets/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(status);
    });

    context('success', () => {
      it('204: deletes a market', async () => {
        await this.assertDelete({ status: 204 });
        await this.assertGetMarket({ status: 404 });
      });
      it('204: deletes a market using genuine marketAdmin token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.marketAdmin,
          marketId: this.market.id
        });
        await this.assertDelete({ token: this.validToken, status: 204 });
        await this.assertGetMarket({ token: this.validToken, status: 404 });
      });
    });

    context('error', () => {
      it('401: no auth header provided', () => request(app)
        .delete(`/markets/${this.market.id}`)
        .expect(401)
        .then(assertErrorFormat));

      it('403: userType does not have access', async () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: uuid(),
          marketId: uuid()
        }));
        const delRes = await this.assertDelete({ status: 403 });
        assertErrorFormat(delRes);
      });

      it('403: user does not have access to the specific market', async () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.marketAdmin,
          userId: uuid(),
          marketId: uuid()
        }));
        const delRes = await this.assertDelete({ id: uuid(), status: 403 });
        assertErrorFormat(delRes);
      });

      it('404: market is not found', async () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.marketAdmin,
          userId: uuid(),
          marketId: this.idNotFound
        }));
        const delRes = await this.assertDelete({ id: this.idNotFound, status: 404 });
        assertErrorFormat(delRes);
      });
    });
  });

  describe('GET/:id/revisions', () => {
    beforeEach(async () => {
      this.assertGetRevisions = ({
        id = this.market.id, token = this.tokenStub, query = {}, status }) =>
        request(app)
          .get(`/markets/${id}/revisions`)
          .query(query)
          .set('Authorization', `Bearer ${token}`)
          .expect(status)
          .then(res => res);

      // creates more market revisions in order to test the limits
      await Promise.map(
        new Array(8).fill(this.updateMarket),
        fn => fn({
          id: this.market.id,
          token: this.tokenStub,
          updates: { description: 'updated desc' }
        }));
    });

    context('success', () => {
      const status = 200;
      it('200: returns a list of market revisions for a specific market using genuine marketAdmin token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.marketAdmin,
          marketId: this.market.id
        });
        const revisionsRes = await this.assertGetRevisions({ token: this.validToken, status });
        revisionsRes.body.should.have.length(10);
      });
      it('200: returns a list of market revisions for a specific market', async () => {
        const revisionsRes = await this.assertGetRevisions({ status });
        revisionsRes.body.should.have.length(10);
        revisionsRes.body[0].id.should.equal(this.market.id);
        revisionsRes.body[0].should.have.property('revisionId');
        revisionsRes.body[0].should.have.property('name');
        revisionsRes.body[0].should.have.property('description');
        revisionsRes.body[0].should.have.property('imageUrl');
        revisionsRes.body[0].should.have.property('isActive');
        revisionsRes.body[0].should.have.property('lit');
        revisionsRes.body[0].should.have.property('rfqDefaultLifespan');
        revisionsRes.body[0].should.have.property('rfqCloseOnAccept');
        revisionsRes.body[0].should.have.property('rfqSchema');
        revisionsRes.body[0].should.have.property('quoteSchema');
        revisionsRes.body[0].should.have.property('acceptanceSchema');
        revisionsRes.body[0].should.have.property('completionSchema');
        revisionsRes.body[0].should.have.property('createdOn');
      });

      it('200: list revisions with a limit', async () => {
        const revisionsRes = await this.assertGetRevisions({ query: { limit: 5 }, status });
        revisionsRes.body.length.should.equal(5);
      });

      it('200: list revisions with an offset value', async () => {
        const revisionsRes = await this.assertGetRevisions({ query: { offset: 2 }, status });
        revisionsRes.body.length.should.equal(8);
      });

      it('200: returns the revisions in reverse chronological order (latest first)', async () => {
        const latestRevision = await this.updateMarket({
          id: this.market.id,
          token: this.patchToken,
          updates: { description: 'latest revision' }
        });

        const revisionsRes = await this.assertGetRevisions({ status });
        revisionsRes.body[0].description.should.equal(latestRevision.description);
      });
    });
    context('error', () => {
      const status = 400;
      it('400: negative offset', async () => {
        const revisionsRes = await this.assertGetRevisions({ query: { offset: -1 }, status });
        assertErrorFormat(revisionsRes);
      });

      it('400: invalid offset', async () => {
        const revisionsRes = await this.assertGetRevisions({ query: { offset: 'abc' }, status });
        assertErrorFormat(revisionsRes);
      });

      it('400: limit is 0', async () => {
        const revisionsRes = await this.assertGetRevisions({ query: { limit: 0 }, status });
        assertErrorFormat(revisionsRes);
      });

      it('400: limit is exceeds maximum', async () => {
        const revisionsRes = await this.assertGetRevisions({ query: { limit: 1001 }, status });
        assertErrorFormat(revisionsRes);
      });

      it('400: invalid limit', async () => {
        const revisionsRes = await this.assertGetRevisions({ query: { limit: 'abc' }, status });
        assertErrorFormat(revisionsRes);
      });

      it('401: no auth header provided', () => request(app)
        .get(`/markets/${this.market.id}/revisions`)
        .expect(401)
        .then(assertErrorFormat));

      it('403: userType does not have access', async () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: uuid(),
          marketId: uuid()
        }));
        const revisionsRes = await this.assertGetRevisions({ status: 403 });
        assertErrorFormat(revisionsRes);
      });

      it('404: market not found', async () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.marketAdmin,
          userId: uuid(),
          marketId: this.idNotFound
        }));
        const revisionsRes = await this.assertGetRevisions({ id: this.idNotFound, status: 404 });
        assertErrorFormat(revisionsRes);
      });
    });
  });

  describe('GET/:id/revisions/:revisionId', () => {
    beforeEach(async () => {
      this.assertGetRevision = ({
        id = this.market.id,
        revisionId = this.market.revisionId,
        token = this.tokenStub,
        status
      }) => request(app)
        .get(`/markets/${id}/revisions/${revisionId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(status)
        .then(res => res);
    });

    context('success', () => {
      it('200: returns a specific market revision', async () => {
        const revisionRes = await this.assertGetRevision({ status: 200 });
        revisionRes.body.should.have.property('id');
        revisionRes.body.id.should.equal(this.market.id);
        revisionRes.body.should.have.property('revisionId');
        revisionRes.body.revisionId.should.equal(this.market.revisionId);
      });
      it('200: returns a specific market revision using genuine marketAdmin token', async () => {
        this.authStub.restore();
        this.validToken = await tokenGenerator.create({
          userType: roles.marketAdmin,
          marketId: this.market.id
        });
        const revisionRes = await this.assertGetRevision({ token: this.validToken, status: 200 });
        revisionRes.body.should.have.property('id');
        revisionRes.body.id.should.equal(this.market.id);
        revisionRes.body.should.have.property('revisionId');
        revisionRes.body.revisionId.should.equal(this.market.revisionId);
      });
    });

    context('error', () => {
      it('401: no auth header provided', () => request(app)
        .get(`/markets/${this.market.id}/revisions/${this.market.revisionId}`)
        .expect(401)
        .then(assertErrorFormat));

      it('403: userType does not have access', async () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.client,
          userId: uuid(),
          marketId: uuid()
        }));
        const revisionRes = await this.assertGetRevision({ status: 403 });
        assertErrorFormat(revisionRes);
      });

      it('403: user does not have access to marketId', async () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.marketAdmin,
          userId: uuid(),
          marketId: uuid()
        }));
        const revisionRes = await this.assertGetRevision({ id: uuid(), status: 403 });
        assertErrorFormat(revisionRes);
      });

      it('404: market is not found', async () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.marketAdmin,
          userId: uuid(),
          marketId: this.idNotFound
        }));
        const revisionRes = await this.assertGetRevision({ id: this.idNotFound, status: 404 });
        assertErrorFormat(revisionRes);
      });

      it('404: market revision is not found', async () => {
        this.authStub.restore();
        this.authStub = sinon.stub(authentication, 'validate').returns(authStub({
          userType: roles.marketAdmin,
          userId: uuid(),
          marketId: this.market.id
        }));
        const revisionRes = await this.assertGetRevision({
          revisionId: this.idNotFound, status: 404 });
        assertErrorFormat(revisionRes);
      });
    });
  });
});
