interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_TTL = 5 * 60 * 1000;

class SimpleCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  private getKey(userId: string, conversationId: string): string {
    return `participant:${userId}:${conversationId}`;
  }

  async get<T>(userId: string, conversationId: string): Promise<T | null> {
    const key = this.getKey(userId, conversationId);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(userId: string, conversationId: string, value: T, ttlMs: number = DEFAULT_TTL): Promise<void> {
    const key = this.getKey(userId, conversationId);
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  async delete(userId: string, conversationId: string): Promise<void> {
    const key = this.getKey(userId, conversationId);
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

export const simpleCache = new SimpleCache();

export async function getCachedParticipant<T>(userId: string, conversationId: string): Promise<T | null> {
  return simpleCache.get<T>(userId, conversationId);
}

export async function setCachedParticipant<T>(userId: string, conversationId: string, value: T, ttlMs?: number): Promise<void> {
  return simpleCache.set(userId, conversationId, value, ttlMs);
}
