const ErrorChecker = require('../../../src/databases/errchecker');
const {
  BaseError,
  ConnectionError,
  DuplicateError,
  DatabaseError,
  InvalidParametersError,
  MissingParametersError
} = require('../../../src/errors');

describe('ErrorChecker', () => {
  describe('#getDbError', () => {
    context('success', () => {
      it('returns a ConnectionError when error code is ECONNREFUSED', () => {
        const mockError = { code: 'ECONNREFUSED' };
        ErrorChecker.getDbError(mockError).should.be.instanceof(ConnectionError);
      });
      it('returns a DuplicateError when error code is 23505', () => {
        const mockError = { code: '23505' };
        ErrorChecker.getDbError(mockError).should.be.instanceof(DuplicateError);
      });
      it('returns a MissingParametersError when error code is 23502', () => {
        const mockError = { code: '23502' };
        ErrorChecker.getDbError(mockError).should.be.instanceof(MissingParametersError);
      });
      it('returns a InvalidParametersError when error code is XX000', () => {
        const mockError = { code: 'XX000' };
        ErrorChecker.getDbError(mockError).should.be.instanceof(InvalidParametersError);
      });
      it('returns a InvalidParametersError when error code is 42703', () => {
        const mockError = { code: '42703' };
        ErrorChecker.getDbError(mockError).should.be.instanceof(InvalidParametersError);
      });
      it('returns a DatabaseError when the error code is none of the above', () => {
        const mockError = { code: 'HELLOWORLD' };
        ErrorChecker.getDbError(mockError).should.be.instanceof(DatabaseError);
      });
      it('returns the same instance of error, when the error is already an instance of BaseError', () => {
        const error = new BaseError();
        ErrorChecker.getDbError(error).should.equal(error);
      });
    });
  });
});
