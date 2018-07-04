const chai = require('chai');
const jwt = require('jsonwebtoken');
const { roles } = require('../../../src/config');
const { authController } = require('../../../src/controllers');

const should = chai.should();

describe('auth controller', () => {
  describe('#create', () => {
    context('success', () => {
      it('should create a token', async () => {
        const tokenProperties = {
          userType: roles.admin,
          marketId: 'marketId'
        };
        const { err, data } = await authController.create(tokenProperties);
        should.not.exist(err);
        should.exist(data);
        const decode = jwt.decode(data);
        decode.permissions.marketId.should.eql(tokenProperties.marketId);
        decode.permissions.userType.should.eql(tokenProperties.userType);
      });
    });
  });
});
