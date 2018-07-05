const chai = require('chai');

const bcrypt = require('../../../src/lib/bcrypt');

chai.should();

describe('Bcrypt Module', () => {
  context('success', () => {
    it('should create hash a password', async () => {
      const input = 'password';
      const hashed = await bcrypt.hash(input);
      hashed.should.not.equal(input);
    });
    it('should validate a password against a hash', async () => {
      const input = 'password';
      const hashed = await bcrypt.hash(input);
      const valid = await bcrypt.compare(input, hashed);
      valid.should.equal(true);
    });
  });
});
