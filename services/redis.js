// services/redis.js
const { createClient } = require("redis");

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  throw new Error("Missing REDIS_URL in environment variables");
}

const client = createClient({ url: REDIS_URL });

client.on("error", (err) => {
  console.error("[redis] error", err);
});

let isReady = false;
let isConnecting = false;

client.on("ready", () => {
  isReady = true;
  isConnecting = false;
  console.log("[redis] connected");
});

async function connectRedis() {
  // Nếu đã ready và client đang mở, return ngay (không tốn thời gian)
  if (isReady && client.isOpen) {
    return client;
  }

  // Nếu đang connect, đợi
  if (isConnecting) {
    while (!isReady) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return client;
  }

  // Bắt đầu connect
  isConnecting = true;
  try {
    if (!client.isOpen) {
      await client.connect();
    }
  } catch (err) {
    isConnecting = false;
    throw err;
  }
  return client;
}

async function cacheGet(key) {
  await connectRedis();
  const val = await client.get(key);
  if (val) console.log(`[CACHE HIT] ${key}`);
  else console.log(`[CACHE MISS] ${key}`);
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

async function cacheSet(key, value, ttlSeconds = 60) {
  await connectRedis();
  console.log(`[CACHE SET] ${key} ttl=${ttlSeconds}s`);
  const payload = typeof value === "string" ? value : JSON.stringify(value);
  if (ttlSeconds) await client.setEx(key, ttlSeconds, payload);
  else await client.set(key, payload);
  return true;
}

async function cacheDel(key) {
  await connectRedis();
  const result = await client.del(key);
  console.log(
    `[CACHE DEL] ${key} - result: ${result} (1=deleted, 0=not found)`
  );
  return result;
}

async function cacheDelByPattern(pattern) {
  await connectRedis();
  const keys = [];
  for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
    keys.push(key);
    if (keys.length >= 500) {
      await client.del(keys.splice(0, keys.length));
    }
  }
  if (keys.length) {
    await client.del(keys);
  }
}

module.exports = {
  client,
  connectRedis,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelByPattern,
};
