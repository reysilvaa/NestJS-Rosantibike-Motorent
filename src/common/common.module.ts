import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryService } from './services';
import { cloudinary } from './config';

@Global()
@Module({
  imports: [ConfigModule.forFeature(cloudinary)],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CommonModule {}
