import Redis from 'ioredis';
import Logger from './logger';

// Simple Redis cache for chat data
// Configure Redis with retry strategy and error handling
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => {
    // If we've retried 3 times, give up
    if (times > 3) {
      return null;
    }
    // Exponential backoff
    return Math.min(times * 50, 2000);
  },
  // Don't crash on connection error
  lazyConnect: true
});

// Handle connection errors to prevent unhandled promise rejections
redis.on('error', (err) => {
  // Only log if it's not a connection refused error (which happens when Redis isn't running)
  if ((err as any).code !== 'ECONNREFUSED') {
    Logger.warn('Redis cache error:', err.message);
  }
});

// Helper to check if redis is ready
const isRedisReady = () => redis.status === 'ready';

export const getCachedParticipant = async (userId: string, conversationId: string) => {
  if (!isRedisReady()) return null;

  const cacheKey = `participant:${userId}:${conversationId}`;

  try {
    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    // Silent fail on cache get
  }

  return null;
};

export const setCachedParticipant = async (userId: string, conversationId: string, data: any) => {
  if (!isRedisReady()) return;

  const cacheKey = `participant:${userId}:${conversationId}`;

  try {
    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(data));
  } catch (error) {
    // Silent fail on cache set
  }
};

export const invalidateParticipantCache = async (userId: string, conversationId: string) => {
  if (!isRedisReady()) return;

  const cacheKey = `participant:${userId}:${conversationId}`;

  try {
    await redis.del(cacheKey);
  } catch (error) {
    // Silent fail on cache delete
  }
};