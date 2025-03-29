import { Controller, Get, Param, Post, Body, Delete, Query } from '@nestjs/common';
import { RedisService } from '../services/redis.service';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';

interface CacheItem {
  key: string;
  value: any;
  ttl?: number;
}

@ApiTags('Redis Debug')
@Controller('debug/redis')
export class RedisController {
  constructor(private readonly redisService: RedisService) {}

  @Get('ping')
  @ApiOperation({ summary: 'Test Redis connection' })
  @ApiResponse({ status: 200, description: 'Returns PONG if Redis is connected' })
  async ping(): Promise<{ status: string; message: string }> {
    try {
      const result = await this.redisService.ping();
      return { status: 'success', message: result };
    } catch (_error) {
      return { status: 'error', message: _error.message };
    }
  }

  @Get('info')
  @ApiOperation({ summary: 'Get Redis server info' })
  async getInfo(): Promise<{ status: string; info: string }> {
    try {
      const info = await this.redisService.getRedisInfo();
      return { status: 'success', info };
    } catch {
      return { status: 'error', info: 'Gagal mendapatkan informasi Redis' };
    }
  }

  @Get('keys')
  @ApiOperation({ summary: 'Get Redis keys by pattern' })
  @ApiQuery({ name: 'pattern', description: 'Key pattern to search for', example: '*' })
  async getKeys(
    @Query('pattern') pattern: string = '*',
  ): Promise<{ status: string; keys: string[] }> {
    try {
      const keys = await this.redisService.keys(pattern);
      return { status: 'success', keys };
    } catch {
      return { status: 'error', keys: [] };
    }
  }

  @Get('key/:key')
  @ApiOperation({ summary: 'Get value of a Redis key' })
  @ApiParam({ name: 'key', description: 'Redis key to get' })
  async getKey(
    @Param('key') key: string,
  ): Promise<{ status: string; exists: boolean; value: any }> {
    try {
      const exists = await this.redisService.exists(key);
      if (!exists) {
        return { status: 'warning', exists: false, value: null };
      }
      const value = await this.redisService.get(key);
      const ttl = await this.redisService.ttl(key);
      return { status: 'success', exists: true, value: { data: value, ttl } };
    } catch {
      return { status: 'error', exists: false, value: null };
    }
  }

  @Post('key')
  @ApiOperation({ summary: 'Set a Redis key-value pair' })
  async setKey(@Body() cacheItem: CacheItem): Promise<{ status: string; message: string }> {
    try {
      await this.redisService.set(cacheItem.key, cacheItem.value, cacheItem.ttl);
      return { status: 'success', message: `Key ${cacheItem.key} set successfully` };
    } catch (_error) {
      return { status: 'error', message: _error.message };
    }
  }

  @Delete('key/:key')
  @ApiOperation({ summary: 'Delete a Redis key' })
  @ApiParam({ name: 'key', description: 'Redis key to delete' })
  async deleteKey(@Param('key') key: string): Promise<{ status: string; message: string }> {
    try {
      const exists = await this.redisService.exists(key);
      if (!exists) {
        return { status: 'warning', message: `Key ${key} does not exist` };
      }
      await this.redisService.del(key);
      return { status: 'success', message: `Key ${key} deleted successfully` };
    } catch {
      return { status: 'error', message: 'Gagal menghapus key' };
    }
  }
}
