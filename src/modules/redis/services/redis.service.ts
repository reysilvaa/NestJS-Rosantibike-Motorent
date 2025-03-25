import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  private redisClient: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    try {
      const host = process.env.REDIS_HOST || 'localhost';
      const port = parseInt(process.env.REDIS_PORT || '6379', 10);

      this.logger.log(`Connecting to Redis at ${host}:${port}`);

      this.redisClient = new Redis({
        host,
        port,
        reconnectOnError: err => {
          this.logger.error(`Redis connection error: ${err.message}`);
          return true;
        },
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Successfully connected to Redis');
      });

      this.redisClient.on('error', err => {
        this.logger.error(`Redis error: ${err.message}`);
      });
    } catch (error) {
      this.logger.error(`Failed to initialize Redis: ${error.message}`);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.cacheManager.get<T>(key);
      this.logger.debug(
        `Cache GET - Key: ${key}, Found: ${result !== null && result !== undefined}`,
      );
      return result;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}: ${error.message}`);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache SET - Key: ${key}, TTL: ${ttl || 'default'}`);
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}: ${error.message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL - Key: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}: ${error.message}`);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      const keys = await this.redisClient.keys(pattern);
      this.logger.debug(`Found ${keys.length} keys matching pattern: ${pattern}`);
      return keys;
    } catch (error) {
      this.logger.error(`Error searching keys with pattern ${pattern}: ${error.message}`);
      return [];
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const exists = (await this.redisClient.exists(key)) === 1;
      this.logger.debug(`Cache EXISTS - Key: ${key}, Exists: ${exists}`);
      return exists;
    } catch (error) {
      this.logger.error(`Error checking if key ${key} exists: ${error.message}`);
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = (await this.redisClient.expire(key, seconds)) === 1;
      this.logger.debug(`Cache EXPIRE - Key: ${key}, Seconds: ${seconds}, Success: ${result}`);
      return result;
    } catch (error) {
      this.logger.error(`Error setting expiry for key ${key}: ${error.message}`);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      const ttl = await this.redisClient.ttl(key);
      this.logger.debug(`Cache TTL - Key: ${key}, TTL: ${ttl}`);
      return ttl;
    } catch (error) {
      this.logger.error(`Error getting TTL for key ${key}: ${error.message}`);
      return -1;
    }
  }

  async ping(): Promise<string> {
    try {
      const result = await this.redisClient.ping();
      this.logger.log(`Redis PING response: ${result}`);
      return result;
    } catch (error) {
      this.logger.error(`Redis PING failed: ${error.message}`);
      return `Error: ${error.message}`;
    }
  }

  async getRedisInfo(): Promise<string> {
    try {
      const info = await this.redisClient.info();
      this.logger.debug('Retrieved Redis server info');
      return info;
    } catch (error) {
      this.logger.error(`Failed to get Redis info: ${error.message}`);
      return `Error: ${error.message}`;
    }
  }
}
