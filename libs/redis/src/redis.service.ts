import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { Inject } from '@nestjs/common';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Get value by key
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      this.logger.error(`Failed to get key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Get value as JSON by key
   */
  async getJson<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Failed to get JSON from key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Set key-value with optional TTL (seconds)
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.redis.setex(key, ttl, value);
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Failed to set key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Set JSON value with optional TTL (seconds)
   */
  async setJson<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const jsonString = JSON.stringify(value);
      await this.set(key, jsonString, ttl);
    } catch (error) {
      this.logger.error(`Failed to set JSON to key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Delete key(s)
   */
  async del(keys: string | string[]): Promise<number> {
    try {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      return await this.redis.del(...keyArray);
    } catch (error) {
      this.logger.error(`Failed to delete keys:`, error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check key existence "${key}":`, error);
      throw error;
    }
  }

  /**
   * Set TTL for key (seconds)
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to set expiry for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Get TTL for key (seconds)
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.error(`Failed to get TTL for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Clear all keys (use with caution!)
   */
  async flushDb(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.logger.warn('Redis database flushed');
    } catch (error) {
      this.logger.error('Failed to flush Redis database:', error);
      throw error;
    }
  }

  /**
   * Increment counter
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (error) {
      this.logger.error(`Failed to increment key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Increment counter by amount
   */
  async incrBy(key: string, increment: number): Promise<number> {
    try {
      return await this.redis.incrby(key, increment);
    } catch (error) {
      this.logger.error(`Failed to increment key "${key}" by ${increment}:`, error);
      throw error;
    }
  }

  /**
   * Decrement counter
   */
  async decr(key: string): Promise<number> {
    try {
      return await this.redis.decr(key);
    } catch (error) {
      this.logger.error(`Failed to decrement key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Add item to set
   */
  async sadd(key: string, members: string | string[]): Promise<number> {
    try {
      const memberArray = Array.isArray(members) ? members : [members];
      return await this.redis.sadd(key, ...memberArray);
    } catch (error) {
      this.logger.error(`Failed to add to set "${key}":`, error);
      throw error;
    }
  }

  /**
   * Get all members of set
   */
  async smembers(key: string): Promise<string[]> {
    try {
      return await this.redis.smembers(key);
    } catch (error) {
      this.logger.error(`Failed to get set members for "${key}":`, error);
      throw error;
    }
  }

  /**
   * Remove member from set
   */
  async srem(key: string, members: string | string[]): Promise<number> {
    try {
      const memberArray = Array.isArray(members) ? members : [members];
      return await this.redis.srem(key, ...memberArray);
    } catch (error) {
      this.logger.error(`Failed to remove from set "${key}":`, error);
      throw error;
    }
  }

  /**
   * Push item(s) to list
   */
  async lpush(key: string, values: string | string[]): Promise<number> {
    try {
      const valueArray = Array.isArray(values) ? values : [values];
      return await this.redis.lpush(key, ...valueArray);
    } catch (error) {
      this.logger.error(`Failed to push to list "${key}":`, error);
      throw error;
    }
  }

  /**
   * Pop item from list
   */
  async lpop(key: string, count?: number): Promise<string | string[] | null> {
    try {
      if (count) {
        return await this.redis.lpop(key, count);
      }
      return await this.redis.lpop(key);
    } catch (error) {
      this.logger.error(`Failed to pop from list "${key}":`, error);
      throw error;
    }
  }

  /**
   * Get all items from list
   */
  async lrange(key: string, start: number = 0, stop: number = -1): Promise<string[]> {
    try {
      return await this.redis.lrange(key, start, stop);
    } catch (error) {
      this.logger.error(`Failed to get list range for "${key}":`, error);
      throw error;
    }
  }

  /**
   * Get raw Redis client for advanced operations
   */
  getClient(): Redis {
    return this.redis;
  }
}
