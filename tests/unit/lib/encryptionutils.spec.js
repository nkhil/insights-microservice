const crypto = require('crypto');
const rewire = require('rewire');
const { EncryptionUtils } = require('../../../src/lib');

describe('EncryptionUtils', () => {
  describe('#encryptStringWithAES256', () => {
    beforeEach((() => {
      this.string = 'Hello, World!';
      this.key = crypto.randomBytes(32);
    }));
    it('should encrypt a string', () => {
      const result = EncryptionUtils.encryptStringWithAES256(this.key, this.string);
      result.ciphertext.should.not.equal(this.string);
    });
    it('should return different values for the same string encrypted twice', () => {
      const encrypted1 = EncryptionUtils.encryptStringWithAES256(this.key, this.string);
      const encrypted2 = EncryptionUtils.encryptStringWithAES256(this.key, this.string);
      encrypted1.ciphertext.should.not.equal(encrypted2.ciphertext);
      encrypted1.IV.should.not.equal(encrypted2.IV);
    });
    it('should return base64 encoded ciphertext', () => {
      const encrypted = EncryptionUtils.encryptStringWithAES256(this.key, this.string);
      encrypted.ciphertext.should.match(
        /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/
      );
    });
  });
  describe('#decryptStringWithAES256', () => {
    beforeEach((() => {
      this.string = 'Hello, World!';
      this.key = crypto.randomBytes(32);
      this.encoded = EncryptionUtils.encryptStringWithAES256(this.key, this.string);
    }));
    it('should decrypt a string', async () => {
      const result = EncryptionUtils.decryptStringWithAES256(
        this.key, this.encoded.IV, this.encoded.ciphertext
      );
      result.should.equal(this.string);
    });
  });
  describe('#encryptStringWithKMSKey', () => {
    beforeEach((() => {
      this.EncryptionUtilsRewired = rewire('../../../src/lib/encryptionutils.js');
      this.string = 'Hello, World!';
      this.KMSKeyID = '7f03b1a6-1a25-4bc4-a5ac-ec1ea70c2dfc';
      this.resultString = new Buffer(this.string);
      const CipherTextBlobStub = { CiphertextBlob: this.resultString };
      const promiseStub = { promise: () => CipherTextBlobStub };
      const kmsStub = { encrypt: () => promiseStub };
      this.EncryptionUtilsRewired.__set__('kms', kmsStub);
    }));
    it('should encrypt a string', async () => {
      const result = await this.EncryptionUtilsRewired.EncryptionUtils.encryptStringWithKMSKey(
        this.KMSKeyID,
        this.string);
      result.should.equal(this.resultString.toString('base64'));
    });
    it('should return base64 encoded ciphertext', async () => {
      const result = await this.EncryptionUtilsRewired.EncryptionUtils.encryptStringWithKMSKey(
        this.KMSKeyID,
        this.string);
      result.should.match(
        /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/
      );
    });
  });
  describe('#decryptStringWithAES256', () => {
    beforeEach(async () => {
      this.EncryptionUtilsRewired = rewire('../../../src/lib/encryptionutils.js');
      this.string = 'Hello, World!';
      this.KMSKeyID = '7f03b1a6-1a25-4bc4-a5ac-ec1ea70c2dfc';
      this.resultString = new Buffer(this.string);
      const CipherTextBlobStub = { CiphertextBlob: this.resultString };
      const PlaintextStub = { Plaintext: this.string };
      const encryptPromiseStub = { promise: () => CipherTextBlobStub };
      const decryptPromiseStub = { promise: () => PlaintextStub };
      const kmsStub = { encrypt: () => encryptPromiseStub, decrypt: () => decryptPromiseStub };
      this.EncryptionUtilsRewired.__set__('kms', kmsStub);
      this.result = await this.EncryptionUtilsRewired.EncryptionUtils.encryptStringWithKMSKey(
        this.KMSKeyID,
        this.string);
    });
    it('should decrypt a string', async () => {
      const result = await this.EncryptionUtilsRewired.EncryptionUtils.decryptStringWithKMSKey(
        this.result);
      result.should.equal(this.string);
    });
  });
});
