import { PartialType } from '@nestjs/swagger';
import { CreateRedisDto } from './create-redis.dto';

export class UpdateRedisDto extends PartialType(CreateRedisDto) {} 