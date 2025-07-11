import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { redisConfig } from '../../../config/redis.config';

@Injectable()
export class RedisService {
  private redisClient: Redis;
  private readonly logger = new Logger(RedisService.name);
  private defaultTtl: number;

  constructor(private configService: ConfigService) {
    try {
      const config = redisConfig();
      const host = config.host;
      const port = config.port;
      this.defaultTtl = config.ttl;

      this.logger.log(`Connecting to Redis at ${host}:${port}`);

      this.redisClient = new Redis({
        host,
        port,
        enableOfflineQueue: true,
        retryStrategy: times => {
          const delay = Math.min(times * 100, 3000);
          this.logger.log(`Redis reconnecting attempt ${times} after ${delay}ms`);
          return delay;
        },
        reconnectOnError: err => {
          this.logger.error(`Redis connection error: ${err.message}`);
          return true;
        },
        maxRetriesPerRequest: null,
        connectTimeout: 10_000,
        autoResubscribe: true,
        autoResendUnfulfilledCommands: true,
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Successfully connected to Redis');
      });

      this.redisClient.on('ready', () => {
        this.logger.log('Redis client is ready for use');
      });

      this.redisClient.on('reconnecting', () => {
        this.logger.log('Redis client is reconnecting...');
      });

      this.redisClient.on('error', err => {
        this.logger.error(`Redis error: ${err.message}`);
      });

      this.redisClient.on('end', () => {
        this.logger.warn('Redis connection closed');
      });
    } catch (error) {
      this.logger.error(`Failed to initialize Redis: ${error.message}`);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.redisClient?.status === 'ready' || this.redisClient?.status === 'connect';
  }

  async reconnect(): Promise<boolean> {
    try {
      if (!this.isConnected()) {
        await this.redisClient.quit();
        await this.redisClient.connect();
        return true;
      }
      return this.isConnected();
    } catch (error) {
      this.logger.error(`Redis reconnect failed: ${error.message}`);
      return false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.redisClient.get(key);
      this.logger.debug(
        `Cache GET - Key: ${key}, Found: ${result !== null && result !== undefined}`,
      );
      return result ? JSON.parse(result) : null;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}: ${error.message}`);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      const expireTime = ttl || this.defaultTtl;
      
      await this.redisClient.set(key, serializedValue, 'EX', expireTime);
      
      this.logger.debug(`Cache SET - Key: ${key}, TTL: ${expireTime}`);
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}: ${error.message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
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

  getClient(): Redis {
    return this.redisClient;
  }
}
