import Redis from 'ioredis';

let redisClient = null;
let isRedisConnected = false;
const memoryCache = new Map();
const MAX_MEMORY_CACHE_ENTRIES = 500;
let analyticsCacheVersion = 0;

function memoryGet(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  // Refresh insertion order so the bounded fallback behaves like an LRU.
  memoryCache.delete(key);
  memoryCache.set(key, entry);
  return entry.value;
}

function memorySet(key, value, ttlSeconds) {
  memoryCache.delete(key);
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  while (memoryCache.size > MAX_MEMORY_CACHE_ENTRIES) {
    memoryCache.delete(memoryCache.keys().next().value);
  }
}

try {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST;
  if (redisUrl) {
    redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: () => null // Don't keep retrying endlessly if redis is down
    });
  } else {
    redisClient = new Redis({
      port: process.env.REDIS_PORT || 6379,
      host: process.env.REDIS_HOST || '127.0.0.1',
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: () => null
    });
  }

  redisClient.on('ready', () => {
    isRedisConnected = true;
    console.log('[Redis] Connected successfully');
  });

  redisClient.on('error', (err) => {
    isRedisConnected = false;
    // Suppress spammy connection errors if redis server is not running
  });

  // Attempt lazy connection
  redisClient.connect().catch(() => {
    isRedisConnected = false;
  });
} catch (e) {
  isRedisConnected = false;
  redisClient = null;
}

export async function getCache(key) {
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.get(key);
      return data !== null ? JSON.parse(data) : null;
    } catch {
      isRedisConnected = false;
    }
  }
  return memoryGet(key);
}

export async function setCache(key, value, ttlSeconds = 300) {
  memorySet(key, value, ttlSeconds);
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      isRedisConnected = false;
    }
  }
}

export async function invalidateAnalyticsCache() {
  analyticsCacheVersion += 1;
  for (const key of memoryCache.keys()) {
    if (key.startsWith('analytics:')) memoryCache.delete(key);
  }
  if (isRedisConnected && redisClient) {
    try {
      let cursor = '0';
      do {
        const result = await redisClient.scan(cursor, 'MATCH', 'analytics:*', 'COUNT', 200);
        cursor = result[0];
        if (result[1].length) await redisClient.del(...result[1]);
      } while (cursor !== '0');
    } catch {
      isRedisConnected = false;
    }
  }
}

export const getAnalyticsCacheVersion = () => analyticsCacheVersion;

export default redisClient;
