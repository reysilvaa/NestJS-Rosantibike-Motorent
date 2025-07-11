import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { RedisService } from '../modules/redis/services/redis.service';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';

export const CACHE_KEY_METADATA = 'cache_key_metadata';
export const CACHE_TTL_METADATA = 'cache_ttl_metadata';

export const CacheKey = (prefix: string) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(CACHE_KEY_METADATA, prefix, descriptor.value);
    return descriptor;
  };
};

export const CacheTTL = (ttl: number) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(CACHE_TTL_METADATA, ttl, descriptor.value);
    return descriptor;
  };
};

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    // Jika request bukan HTTP, skip caching
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    
    // Skip caching untuk metode non-GET
    if (request.method !== 'GET') {
      return next.handle();
    }

    const handler = context.getHandler();
    
    // Ambil prefix cache key dari metadata (jika ada)
    const cacheKeyPrefix = this.reflector.get(CACHE_KEY_METADATA, handler) || '';
    
    // Ambil TTL dari metadata atau gunakan default
    const cacheTTL = this.reflector.get(CACHE_TTL_METADATA, handler);
    
    // Buat cache key berdasarkan URL dan query parameters
    const cacheKey = this.createCacheKey(cacheKeyPrefix, request);
    
    try {
      // Coba ambil data dari cache
      const cachedData = await this.redisService.get(cacheKey);
      
      if (cachedData) {
        return of(cachedData);
      }
      
      // Jika tidak ada di cache, lanjutkan request dan simpan hasilnya
      return next.handle().pipe(
        tap(async (data) => {
          await this.redisService.set(cacheKey, data, cacheTTL);
        }),
      );
    } catch (error) {
      // Jika ada error dengan Redis, lanjutkan tanpa caching
      return next.handle();
    }
  }

  private createCacheKey(prefix: string, request: Request): string {
    const url = request.originalUrl || request.url;
    return `${prefix}:${url}`;
  }
} 