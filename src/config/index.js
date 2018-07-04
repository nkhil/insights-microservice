module.exports = {
  express: {
    port: parseInt(process.env.EXPRESS_PORT, 10) || 3000
  },
  // defines the application environment
  environment: process.env.ENVIRONMENT || 'local',
  database: {
    // defines the connection details for the PostgreSQL/CockroachDB
    name: process.env.DATABASE_NAME || 'erebus',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 26257,
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || 'unsecurepassword',
    pool_size: {
      min: 0,
      max: parseInt(process.env.DATABASE_MAX_POOLS, 10) || 20
    },
    acquire_connection_timeout:
      parseInt(process.env.DATABASE_TIMEOUT, 10)
      || 10000 // 10,000ms (10sec)
  },
  dispatch: {
    request_timeout: parseInt(process.env.REQUEST_TIMEOUT, 10) || 5000
  },
  logging: {
    // defines the details for the logger
    level: process.env.LOG_LEVEL || 'info'
  },
  auth: {
    // defines the JWT authenication parameters
    issuer: process.env.JWT_ISSUER || 'jigsaw.xyz',
    subject: process.env.SUBJECT || 'admin',
    type: process.env.SUBJECT_TYPE || 'admin',
    secret: process.env.SECRET || 'abc123',
    tokenExpiry:
      parseInt(process.env.TOKEN_EXPIRY_SECONDS, 10)
      || ((60 * 60 * 1000) * 24) * 182 // 6 months
  },
  event_stream: {
    // defines the details of the stream to which hub events are written for analytics etc.
    aws_region: process.env.AWS_REGION || 'eu-west-1',
    kinesis_name: process.env.KINESIS_NAME,
    kms_key_id: process.env.KMS_KEY_ID,
    aes_key_ciphertext: process.env.AES_KEY_CIPHERTEXT
  },
  roles: {
    // defines the access roles for the application
    superAdmin: 'superAdmin', // access everything except POST /rfq, /quote & PATCH /quote/accept, /quote/reject, /quote/complete
    admin: 'admin', // everything except POST /auth, POST /rfq, /quote & PATCH /quote/accept, /quote/reject, /quote/complete
    marketAdmin: 'marketAdmin', // all market actions for a market
    clientAdmin: 'clientAdmin', // all client actions for a market expect POST /rfq, /quote & PATCH /quote/accept, /quote/reject, /quote/complete
    providerAdmin: 'providerAdmin', // all provider actions for a market expect POST /rfq, /quote & PATCH /quote/accept, /quote/reject, /quote/complete
    client: 'client', // access some client actions
    provider: 'provider' // access some provider actions
  },
  metrics: {
    // defines the metric agent hostname
    dogStatsHost: process.env.DOGSTATS_HOST || 'localhost'
  }
};
