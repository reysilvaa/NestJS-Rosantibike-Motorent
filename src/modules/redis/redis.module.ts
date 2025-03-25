import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import redisConfig from '../../config/redis.config';
import { RedisService } from './redis.service';
import { RedisController } from './redis.controller';

@Module({
  imports: [
    ConfigModule.forFeature(redisConfig),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('redis.host'),
        port: configService.get('redis.port'),
        ttl: configService.get('redis.ttl'),
        max: configService.get('redis.max'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [RedisController],
  providers: [RedisService],
  exports: [CacheModule, RedisService],
})
export class RedisModule {}
