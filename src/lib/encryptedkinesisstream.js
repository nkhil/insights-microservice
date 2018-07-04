const stringStream = require('string-to-stream');
const { Transform } = require('stream');
const uuid = require('uuid/v4');
const AWS = require('aws-sdk');
const { metrics } = require('../lib');


const { EncryptionUtils } = require('./encryptionutils');
const config = require('../config');
const logger = require('../logger');

const kinesis = new AWS.Kinesis({ region: config.event_stream.aws_region });

// provides encrypted writes to a kinesis stream.
// encryption is provided by AES-256.
// the key is encrypted with a KMS master key to prevent unauthorised access.
class EncryptedKinesisStream {
  constructor({ destination, KMSKeyID, AESCipherText }) {
    this.key = null;
    this.destination = destination;
    this.KMSKeyID = KMSKeyID;
    this.AESCipherText = AESCipherText;
  }

  // returns a transformation which encrypts the stream with an AESKey
  static encryptWithAES256({ AESKey }) {
    logger.invocation({ args: { AESKey } });
    return new Transform({
      writableObjectMode: true,
      async transform(chunk, encoding, callback) {
        try {
          const { ciphertext, IV } = EncryptionUtils.encryptStringWithAES256(
            AESKey, chunk.toString()
          );
          callback(null, JSON.stringify({ ciphertext, IV }));
        } catch (e) {
          logger.error({ message: `Failed to encrypt kinesis event: ${e.message}` });
          metrics.increment('errors');
          callback(e, null);
        }
      }
    });
  }

  // returns a transformation which encrypts the stream with a KMSKey
  static encryptWithKMSKey({ KMSKeyID }) {
    logger.invocation({ args: { KMSKeyID } });
    return new Transform({
      writableObjectMode: true,
      async transform(chunk, encoding, callback) {
        try {
          const decrypted = await EncryptionUtils.encryptStringWithKMSKey(
            KMSKeyID, chunk.toString()
          );
          callback(null, decrypted);
        } catch (e) {
          logger.error({ message: `Failed to encrypt kinesis event: ${e.message}` });
          metrics.increment('errors');
          callback(e, null);
        }
      }
    });
  }

  // returns a transformation which pushes data into given kinesis stream
  static pushToKinesis({ StreamName }) {
    logger.invocation({ args: { StreamName } });
    return new Transform({
      writableObjectMode: true,
      async transform(chunk, encoding, callback) {
        try {
          const params = {
            Data: chunk.toString(),
            PartitionKey: uuid(),
            StreamName
          };
          const result = await kinesis.putRecord(params).promise();

          callback(null, JSON.stringify(result));
        } catch (e) {
          logger.error({ message: `Failed to publish kinesis event: ${e.message}` });
          metrics.increment('errors');
          callback(e, null);
        }
      }
    });
  }

  async writeEvent({ event }) {
    logger.invocation({ args: { event } });
    if (!this.destination) {
      logger.debug({ message: 'Kinesis Destination ARN Not Set' });
      return null;
    }
    const timer = logger.startTimer();
    try {
      return stringStream(`${JSON.stringify(event)}\n`)
        .pipe(EncryptedKinesisStream.encryptWithKMSKey({ KMSKeyID: this.KMSKeyID }))
        .on('error', e => timer.stop().debug({ message: `failed to encrypt kinesis event: ${e.message}` }))
        .pipe(EncryptedKinesisStream.pushToKinesis({ StreamName: this.destination }))
        .on('error', e => timer.stop().debug({ message: `failed to send to kinesis: ${e.message}` }))
        .on('finish', () => timer.stop().debug({ message: 'pushed event to kinesis' }));
    } catch (e) {
      timer.stop().error({ message: `Failed to write encrypted kinesis event: ${e.message}` });
      metrics.increment('errors');
      return null;
    }
  }
}

module.exports = {
  EncryptedKinesisStream
};
