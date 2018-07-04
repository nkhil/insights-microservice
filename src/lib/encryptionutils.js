const crypto = require('crypto');
const AWS = require('aws-sdk');

const config = require('../config');
const logger = require('../logger');
const { metrics } = require('../lib');

const kms = new AWS.KMS({ region: config.event_stream.aws_region });

class EncryptionUtils {
  // encrypts an arbitary file with a KMS master key.
  // encrypted file is base64d and saved to given location.
  static async encryptStringWithKMSKey(kmsKeyId, string) {
    try {
      const key = await kms.encrypt({ KeyId: kmsKeyId, Plaintext: string }).promise();
      return key.CiphertextBlob.toString('base64');
    } catch (e) {
      logger.error({ message: `Failed to Encrypt String With KMS Key: ${e.message}` });
      metrics.increment('errors');
      throw e;
    }
  }

  // decrypts an arbitary string which has been encrypted using KMS.
  // metadata around which key to used is stored as part of the file.
  // assumes string is base64 encoded
  // returns plaintext.
  static async decryptStringWithKMSKey(string) {
    try {
      const buffer = Buffer.from(string, 'base64');
      const decrypted = await kms.decrypt({ CiphertextBlob: buffer }).promise();
      return decrypted.Plaintext;
    } catch (e) {
      logger.error({ message: `Failed to Decrypt With KMS Key: ${e.message}` });
      metrics.increment('errors');
      throw e;
    }
  }

  // encrypts a string with AES-256 key.
  // returns base64 of ciphertext and IV.
  static encryptStringWithAES256(key, string) {
    try {
      const IV = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes256', key, IV);
      let ciphertext = cipher.update(string, 'utf8', 'base64');
      ciphertext += cipher.final('base64');
      return { ciphertext, IV: IV.toString('base64') };
    } catch (e) {
      logger.error({ message: `Failed to Encrypt String With AES Key: ${e.message}` });
      metrics.increment('errors');
      throw e;
    }
  }

  // decrypts a string with AES-256 key and IV.
  // it assumes IV and string have been based64 after encryption.
  // returns plaintext
  static decryptStringWithAES256(key, base64IV, string) {
    try {
      const IV = Buffer.from(base64IV, 'base64');
      const ciphertext = Buffer.from(string, 'base64');
      const cipher = crypto.createDecipheriv('aes256', key, IV);
      let decrypted = cipher.update(ciphertext, 'utf8', 'base64');
      decrypted += cipher.final('base64');
      return Buffer.from(decrypted, 'base64').toString();
    } catch (e) {
      logger.error({ message: `Failed to Decrypt String With AES Key: ${e.message}` });
      metrics.increment('errors');
      throw e;
    }
  }
}

module.exports = {
  EncryptionUtils
};
