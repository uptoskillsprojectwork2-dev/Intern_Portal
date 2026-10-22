import Redis from 'ioredis';

let redisClient = null;
let isRedisConnected = false;

// Simple in-memory fallback cache when Redis is not running or configured
const memoryCache = new Map();

try {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: () => null // Don't keep retrying endlessly if redis is down
    });
  } else if (process.env.REDIS_HOST) {
    redisClient = new Redis({
      port: Number(process.env.REDIS_PORT) || 6379,
      host: process.env.REDIS_HOST,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: () => null
    });
  }

  if (redisClient) {
    redisClient.on('connect', () => {
      isRedisConnected = true;
      console.log('[Redis] Connected successfully');
    });

    redisClient.on('error', () => {
      isRedisConnected = false;
      // Suppress spammy connection errors if redis server is not running
    });

    // Attempt lazy connection
    redisClient.connect().catch(() => {
      isRedisConnected = false;
    });
  }
} catch (e) {
  isRedisConnected = false;
  redisClient = null;
}

export async function getCache(key) {
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.get(key);
      if (data) return JSON.parse(data);
    } catch {
      // Fallback to memory cache on redis read failure
    }
  }

  const cached = memoryCache.get(key);
  if (cached) {
    if (Date.now() < cached.expiresAt) {
      return cached.data;
    }
    memoryCache.delete(key);
  }
  return null;
}

export async function setCache(key, value, ttlSeconds = 300) {
  // Always store in memory cache as primary or fallback
  memoryCache.set(key, {
    data: value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });

  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Best-effort redis write
    }
  }
}

export async function invalidateAnalyticsCache() {
  memoryCache.clear();

  if (isRedisConnected && redisClient) {
    try {
      const keys = await redisClient.keys('analytics:*');
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch {
      // Ignore cache invalidation failures
    }
  }
}

export function isUsingRedis() {
  return isRedisConnected;
}

export default redisClient;
