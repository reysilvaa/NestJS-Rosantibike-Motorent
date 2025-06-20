import { Module, Global } from '@nestjs/common';
import { CloudinaryService } from '.';

@Global()
@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
