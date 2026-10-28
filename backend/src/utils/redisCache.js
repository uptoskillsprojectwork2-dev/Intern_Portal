import Redis from 'ioredis';

let redisClient = null;
let isRedisConnected = false;
const memoryCache = new Map();

try {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST;
  if (redisUrl) {
    redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: () => null
    });

    redisClient.on('connect', () => {
      isRedisConnected = true;
      console.log('[Redis] Connected successfully');
    });

    redisClient.on('error', () => {
      isRedisConnected = false;
    });

    redisClient.connect().catch(() => {
      isRedisConnected = false;
    });
  }
} catch {
  isRedisConnected = false;
  redisClient = null;
}

export async function getCache(key) {
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.get(key);
      if (data) return JSON.parse(data);
    } catch {
      // Fallback to in-memory cache
    }
  }

  const cached = memoryCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return cached.value;
}

export async function setCache(key, value, ttlSeconds = 300) {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Ignore Redis set failures
    }
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}

export async function invalidateAnalyticsCache() {
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

  for (const key of memoryCache.keys()) {
    if (key.startsWith('analytics:')) {
      memoryCache.delete(key);
    }
  }
}

export default redisClient;
