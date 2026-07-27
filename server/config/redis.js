// Optional Redis cache. If REDIS_URL isn't set (e.g. you haven't added the
// Railway Redis add-on yet), everything using this just falls back to
// hitting Postgres directly — nothing breaks, you just don't get the
// speed-up until you configure it.

const Redis = require('ioredis');

let client = null;
if (process.env.REDIS_URL) {
  client = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2 });
  client.on('error', (err) => console.error('Redis error (falling back to DB):', err.message));
}

module.exports = client; // null if not configured — callers must handle that
