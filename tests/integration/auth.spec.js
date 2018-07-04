const chai = require('chai');
const request = require('supertest');
const uuid = require('uuid/v4');
const sinon = require('sinon');
const app = require('../../src').app;
const { roles } = require('../../src/config');
const { authentication } = require('../../src/authentication');
const { tokenGenerator, Helpers } = require('../assets');

const { assertErrorFormat } = Helpers;

chai.should();

/* eslint-disable */
process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise ', p, ' reason: ', reason);
  process.exit(1);
});
/* eslint-enable */

describe('/auth', () => {
  describe('POST', () => {
    beforeEach(() => {
      this.tokenStub = 123;
      this.superAdminStub = {
        err: null,
        data: { permissions: { userType: roles.superAdmin } }
      };
    });

    context('success', () => {
      beforeEach(() => {
        sinon.stub(authentication, 'validate').returns(this.superAdminStub);
      });

      afterEach(() => {
        authentication.validate.restore();
      });

      it('should create a new token', () => {
        const payload = {
          userType: roles.client,
          userId: uuid(),
          marketId: uuid()
        };

        return request(app)
          .post('/auth')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(payload)
          .expect(200)
          .then((res) => {
            res.body.should.have.property('token');
          });
      });
    });

    context('error', () => {
      beforeEach(() => {
        sinon.stub(authentication, 'validate').returns(this.superAdminStub);
      });

      afterEach(() => {
        authentication.validate.restore();
      });

      it('should return a 400 status if invalid userAdmin paylaod', () => {
        const payload = {
          userType: 'marketAdmin',
          userId: uuid(),
          marketId: uuid()
        };

        return request(app)
          .post('/auth')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(payload)
          .expect(400)
          .then(assertErrorFormat);
      });

      it('should return a 400 status if invalid administraotr paylaod', () => {
        const payload = {
          userType: 'admin',
          userId: uuid(),
          marketId: uuid()
        };

        return request(app)
          .post('/auth')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(payload)
          .expect(400)
          .then(assertErrorFormat);
      });

      it('should return a 400 status if invalid user paylaod', () => {
        const payload = {
          userType: 'provider',
          marketId: uuid()
        };

        return request(app)
          .post('/auth')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(payload)
          .expect(400)
          .then(assertErrorFormat);
      });

      it('should return a 400 status if invalid userType', () => {
        const payload = {
          userType: 'not a valid userType',
          userId: uuid(),
          marketId: uuid()
        };

        return request(app)
          .post('/auth')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(payload)
          .expect(400)
          .then(assertErrorFormat);
      });

      it('should return a 400 status if invalid userId', () => {
        const payload = {
          userType: roles.client,
          userId: 1,
          marketId: uuid()
        };

        return request(app)
          .post('/auth')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(payload)
          .expect(400)
          .then(assertErrorFormat);
      });

      it('should return a 400 status if invalid marketId', () => {
        const payload = {
          userType: roles.provider,
          userId: uuid(),
          marketId: 1
        };

        return request(app)
          .post('/auth')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(payload)
          .expect(400)
          .then(assertErrorFormat);
      });

      it('should return a 400 status if missing userType', () => {
        const payload = {
          userId: uuid(),
          marketId: uuid()
        };

        return request(app)
          .post('/auth')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(payload)
          .expect(400)
          .then(assertErrorFormat);
      });

      it('should return a 400 status if missing userId', () => {
        const payload = {
          userType: roles.provider,
          marketId: uuid()
        };

        return request(app)
          .post('/auth')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(payload)
          .expect(400)
          .then(assertErrorFormat);
      });

      it('should return a 400 status if missing marketId', () => {
        const payload = {
          userType: roles.providerAdmin,
          userId: uuid()
        };

        return request(app)
          .post('/auth')
          .set('Content-Type', 'application/json')
          .set('Authorization', `Bearer ${this.tokenStub}`)
          .send(payload)
          .expect(400)
          .then(assertErrorFormat);
      });
    });

    describe('auth and access', () => {
      context('success', () => {
        beforeEach(async () => {
          this.validToken = await tokenGenerator.create({ userType: roles.superAdmin });
        });

        it('should allow access with valid token', () => {
          const payload = {
            userType: roles.client,
            userId: uuid(),
            marketId: uuid()
          };

          return request(app)
            .post('/auth')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${this.validToken}`)
            .send(payload)
            .expect(200);
        });
      });

      context('failures', () => {
        beforeEach(() => {
          this.unauthorizedUserType = {
            err: null,
            data: {
              permissions: {
                userType: roles.client,
                userId: uuid(),
                marketId: uuid()
              }
            }
          };

          sinon.stub(authentication, 'validate').returns(this.unauthorizedUserType);
        });

        afterEach(() => {
          authentication.validate.restore();
        });

        it('should return 401 unauthorized if no authentication header provided', () => {
          const payload = {
            userType: roles.client,
            userId: uuid(),
            marketId: uuid()
          };

          return request(app)
            .post('/auth')
            .set('Content-Type', 'application/json')
            .send(payload)
            .expect(401)
            .then(assertErrorFormat);
        });

        it('should return 403 forbidden if userType unauthorized', () => {
          const payload = {
            userType: roles.client,
            userId: uuid(),
            marketId: uuid()
          };

          return request(app)
            .post('/auth')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${this.tokenStub}`)
            .send(payload)
            .expect(403)
            .then(assertErrorFormat);
        });
        it('should return 401 unauthorized if token payload is wrong but authentication passes', () => {
          authentication.validate.restore();
          sinon.stub(authentication, 'validate').returns({
            err: null,
            data: {
              perm:
                {
                  userId: 'superUser',
                  userType: 'admin',
                  privileges: [1, 2, 3]
                }
            }
          });
          const payload = {
            userType: roles.client,
            userId: uuid(),
            marketId: uuid()
          };

          return request(app)
            .post('/auth')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${this.tokenStub}`)
            .send(payload)
            .expect(401)
            .then(assertErrorFormat);
        });
      });
    });
  });
});
