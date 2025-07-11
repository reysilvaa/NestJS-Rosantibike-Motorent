import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { cloudinaryConfig } from '../../../config/cloudinary.config';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    cloudinary.config({
      cloud_name: cloudinaryConfig().cloudName,
      api_key: cloudinaryConfig().apiKey,
      api_secret: cloudinaryConfig().apiSecret,
      secure: true,
    });

    this.logger.log('Cloudinary service initialized');
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    try {
      if (!file || !file.buffer) {
        this.logger.error('File atau buffer file tidak valid');
        throw new Error('File tidak valid');
      }

      this.logger.log(
        `Mencoba upload file: ${file.originalname}, mimetype: ${file.mimetype}, size: ${file.size} bytes ke folder: ${folder}`,
      );

      const config = cloudinaryConfig();
      if (
        !config.cloudName ||
        !config.apiKey ||
        !config.apiSecret
      ) {
        this.logger.error('Konfigurasi Cloudinary tidak lengkap');
        throw new Error('Konfigurasi Cloudinary tidak valid');
      }

      const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

      const result = await cloudinary.uploader.upload(fileBase64, {
        folder,
        resource_type: 'auto',
        timeout: 60_000,
      });

      if (!result || !result.secure_url) {
        this.logger.error('Respons Cloudinary tidak valid');
        throw new Error('Gagal mengupload file ke Cloudinary: respons tidak valid');
      }

      this.logger.log(`File berhasil diupload ke Cloudinary: ${result.public_id}`);
      this.logger.log(`URL file: ${result.secure_url}`);

      return result.secure_url;
    } catch (error) {
      this.logger.error(`Error uploading file to Cloudinary: ${error.message}`);
      this.logger.error(error.stack);
      throw new Error(`Gagal mengupload file ke Cloudinary: ${error.message}`);
    }
  }

  async uploadJenisMotorImage(file: Express.Multer.File): Promise<string> {
    const config = cloudinaryConfig();
    return this.uploadFile(file, config.jenisMotoFolder);
  }

  async uploadBlogImage(file: Express.Multer.File): Promise<string> {
    const config = cloudinaryConfig();
    return this.uploadFile(file, config.blogFolder);
  }

  async deleteFile(url: string): Promise<void> {
    try {
      const publicId = this.getPublicIdFromUrl(url);

      if (!publicId) {
        this.logger.warn(`Tidak dapat mengekstrak public_id dari URL: ${url}`);
        return;
      }

      const result = await cloudinary.uploader.destroy(publicId);

      if (result.result === 'ok') {
        this.logger.log(`File berhasil dihapus dari Cloudinary: ${publicId}`);
      } else {
        this.logger.warn(
          `Gagal menghapus file dari Cloudinary: ${publicId}, result: ${result.result}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error deleting file from Cloudinary: ${error.message}`);
    }
  }

  private getPublicIdFromUrl(url: string): string | null {
    try {
      const urlParts = url.split('/');
      const lastPart = urlParts.at(-1);

      if (!lastPart) return null;

      const filenameParts = lastPart.split('.');

      filenameParts.pop();

      const filename = filenameParts.join('.');

      const folderIndex = urlParts.indexOf('upload');
      if (folderIndex === -1) return null;

      const pathParts = urlParts.slice(folderIndex + 2);
      pathParts[pathParts.length - 1] = filename;

      return pathParts.join('/');
    } catch (error) {
      this.logger.error(`Error extracting public_id from URL: ${error.message}`);
      return null;
    }
  }
}
