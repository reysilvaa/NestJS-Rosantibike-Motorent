import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/services/redis.service';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly keyPrefix = 'cache:';

  constructor(private readonly redisService: RedisService) {}

  /**
   * Mendapatkan data dari cache
   * @param key Cache key
   * @returns Data dari cache atau null jika tidak ada
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.redisService.get<T>(`${this.keyPrefix}${key}`);
    } catch (error) {
      this.logger.error(`Error getting cache for key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Menyimpan data ke cache
   * @param key Cache key
   * @param value Data yang akan disimpan
   * @param ttl Waktu kedaluwarsa dalam detik (opsional)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.redisService.set(`${this.keyPrefix}${key}`, value, ttl);
    } catch (error) {
      this.logger.error(`Error setting cache for key ${key}: ${error.message}`);
    }
  }

  /**
   * Menghapus data dari cache
   * @param key Cache key
   */
  async del(key: string): Promise<void> {
    try {
      await this.redisService.del(`${this.keyPrefix}${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache for key ${key}: ${error.message}`);
    }
  }

  /**
   * Menghapus semua cache dengan prefix tertentu
   * @param pattern Pattern untuk menghapus cache (contoh: "users:*")
   */
  async delByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redisService.keys(`${this.keyPrefix}${pattern}`);
      for (const key of keys) {
        await this.redisService.del(key);
      }
      this.logger.debug(`Deleted ${keys.length} cache keys matching pattern ${pattern}`);
    } catch (error) {
      this.logger.error(`Error deleting cache by pattern ${pattern}: ${error.message}`);
    }
  }

  /**
   * Mendapatkan atau menyimpan data ke cache
   * @param key Cache key
   * @param factory Fungsi untuk mendapatkan data jika tidak ada di cache
   * @param ttl Waktu kedaluwarsa dalam detik (opsional)
   * @returns Data dari cache atau hasil dari factory
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cachedData = await this.get<T>(key);
    
    if (cachedData !== null) {
      return cachedData;
    }

    try {
      const data = await factory();
      await this.set(key, data, ttl);
      return data;
    } catch (error) {
      this.logger.error(`Error in getOrSet for key ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Memperbarui data di cache dengan fungsi transform
   * @param key Cache key
   * @param transform Fungsi untuk memperbarui data
   * @param ttl Waktu kedaluwarsa dalam detik (opsional)
   */
  async update<T>(key: string, transform: (oldValue: T | null) => Promise<T>, ttl?: number): Promise<void> {
    try {
      const oldValue = await this.get<T>(key);
      const newValue = await transform(oldValue);
      await this.set(key, newValue, ttl);
    } catch (error) {
      this.logger.error(`Error updating cache for key ${key}: ${error.message}`);
    }
  }
} 