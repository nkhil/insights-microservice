const chai = require('chai');
const { MissingParametersError } = require('../../../src/errors');
const { MockGenerator } = require('../../assets');
const Authentication = require('../../../src/authentication/authentication');

const should = chai.should();

describe('authentication', () => {
  beforeEach(() => {
    this.MockGenerator = new MockGenerator();
    this.testAuth = new Authentication({ generator: this.MockGenerator });
    this.permissions = { userType: 'admin' };
  });

  describe('#create', () => {
    context('success', () => {
      it('should create a token', async () => {
        const { err, data } = await this.testAuth.create({ permissions: this.permissions });
        should.not.exist(err);
        should.exist(data);
      });
    });

    context('failure', () => {
      it('should return error if missing required parameters', async () => {
        const { err, data } = await this.testAuth.create({});
        should.not.exist(data);
        err.should.be.instanceof(MissingParametersError);
      });
    });
  });

  describe('#validate', () => {
    context('success', () => {
      beforeEach(async () => {
        ({ data: this.token } = await this.testAuth.create({ permissions: this.permissions }));
      });

      it('should validate a token', async () => {
        const { err, data } = await this.testAuth.validate({ token: this.token });
        should.not.exist(err);
        data.should.eql(this.permissions);
      });
    });

    context('failure', () => {
      it('should return error if missing required parameters', async () => {
        const { err, data } = await this.testAuth.validate({});
        should.not.exist(data);
        err.should.be.instanceof(MissingParametersError);
      });
    });
  });
});
