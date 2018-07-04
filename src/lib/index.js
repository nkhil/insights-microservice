const config = require('../config');
const distance = require('./distance');
const { EncryptionUtils } = require('./encryptionutils');
const { EncryptedKinesisStream } = require('./encryptedkinesisstream');
const toSnakeCase = require('./tosnakecase');
const metrics = require('./datadogmetrics');

const analyticsStream = new EncryptedKinesisStream({
  destination: config.event_stream.kinesis_name,
  KMSKeyID: config.event_stream.kms_key_id,
  AESCipherText: config.event_stream.aes_key_ciphertext
});

module.exports = {
  distance,
  EncryptionUtils,
  analyticsStream,
  toSnakeCase,
  metrics
};
