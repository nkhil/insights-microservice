const { expect } = require('chai');
const nock = require('nock');
const config = require('../../src/config');
const controllers = require('../../src/controllers');
const transactions = require('../responses/transactions');

describe('Transactions Controller', () => {
  afterEach(() => nock.cleanAll());

  describe('#list', () => {
    context('SUCCESS:', () => {
      it('returns a list of transactions', async () => {
        // mocks the call to the Transactions Service
        const transactionsMock = nock(config.transactions.url)
          .get('')
          .reply(200, transactions);

        const result = await controllers.transactions.list();
        expect(result).to.eql(transactions);
        // asserts the mock was called
        transactionsMock.done();
      });
    });

    context('ERROR:', () => {
      it('returns a 500 error when an error is thrown by the Transactions Service', async () => {
        // mocks the call to the Transactions Service
        const transactionsMock = nock(config.transactions.url)
          .get('')
          .reply(500);

        try {
          await controllers.transactions.list();
          // ensure the catch block is called so that our assertions are run
          throw new Error();
        } catch (error) {
          expect(error.statusCode).to.equal(500);
          // asserts the mock was called
          transactionsMock.done();
        }
      });
    });
  });
});
