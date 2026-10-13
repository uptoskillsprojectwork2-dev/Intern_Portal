import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const CACHE_PREFIX = 'analytics:';
const DEFAULT_TTL = 180; // 3 minutes

let redisClient = null;
let redisAvailable = false;

const initRedis = () => {
    if (redisClient) return redisClient;

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        console.warn('[Redis] REDIS_URL not set; analytics caching disabled.');
        return null;
    }

    try {
        redisClient = new Redis(redisUrl);
        redisClient.on('error', (err) => {
            console.error('[Redis] Connection error:', err.message);
            redisAvailable = false;
        });
        redisClient.on('connect', () => {
            redisAvailable = true;
        });
        redisClient.on('reconnecting', () => {
            redisAvailable = false;
        });
    } catch (err) {
        console.warn('[Redis] Failed to initialize:', err.message);
        redisClient = null;
    }

    return redisClient;
};

initRedis();

export const getClient = () => redisClient;

export const cacheGet = async (key) => {
    if (!redisClient || !redisAvailable) return null;
    try {
        const cached = await redisClient.get(`${CACHE_PREFIX}${key}`);
        if (cached) {
            return JSON.parse(cached);
        }
        return null;
    } catch (err) {
        return null;
    }
};

export const cacheSet = async (key, value, ttl = DEFAULT_TTL) => {
    if (!redisClient || !redisAvailable) return;
    try {
        await redisClient.setex(`${CACHE_PREFIX}${key}`, ttl, JSON.stringify(value));
    } catch (err) {
    }
};

export const cacheDelete = async (key) => {
    if (!redisClient || !redisAvailable) return;
    try {
        await redisClient.del(`${CACHE_PREFIX}${key}`);
    } catch (err) {
    }
};

export const clearAnalyticsCache = async () => {
    if (!redisClient || !redisAvailable) return;
    try {
        const keys = await redisClient.keys(`${CACHE_PREFIX}*`);
        if (keys.length > 0) {
            await redisClient.del(...keys);
        }
    } catch (err) {
        try {
            await redisClient.flushdb();
        } catch (flushErr) {
        }
    }
};

export const createCacheMiddleware = (ttl = DEFAULT_TTL) => {
    return async (req, res, next) => {
        const cacheKey = `${req.originalUrl}`;
        const cached = await cacheGet(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const originalJson = res.json;
        res.json = function (body) {
            cacheSet(cacheKey, body, ttl);
            return originalJson.call(this, body);
        };

        next();
    };
};
