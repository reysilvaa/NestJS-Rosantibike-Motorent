import { Module, Global } from '@nestjs/common';
import { CloudinaryService } from '.';

/**
 * CommonModule - Menyediakan layanan umum yang digunakan di seluruh aplikasi
 *
 * Modul ini bersifat global dan menyediakan layanan seperti Cloudinary
 * untuk digunakan di seluruh aplikasi tanpa perlu diimpor ulang.
 */
@Global()
@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
