import { Module, Global, Provider } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheInterceptor } from '../../interceptors/cache.interceptor';
import { RedisModule } from '../redis/redis.module';
import { CacheService } from './services/cache.service';

@Global()
@Module({
  imports: [RedisModule],
  providers: [
    CacheService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
  exports: [CacheService],
})
export class CacheModule {} 