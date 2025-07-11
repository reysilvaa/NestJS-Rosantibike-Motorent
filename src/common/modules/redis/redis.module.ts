import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './services/redis.service';
import { RedisController } from './controllers/redis.controller';
import { redisConfig } from '../../config/redis.config';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(redisConfig),
  ],
  controllers: [RedisController],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
