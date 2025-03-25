import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private configService: ConfigService) {
    // Inisialisasi konfigurasi Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get('cloudinary.cloudName'),
      api_key: this.configService.get('cloudinary.apiKey'),
      api_secret: this.configService.get('cloudinary.apiSecret'),
      secure: true,
    });
    
    this.logger.log('Cloudinary service initialized');
  }

  /**
   * Upload file ke Cloudinary
   * @param file Buffer file
   * @param folder Folder tempat menyimpan file
   * @returns URL gambar yang diupload
   */
  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    try {
      // Konversi file buffer ke base64
      const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      
      // Upload ke Cloudinary
      const result = await cloudinary.uploader.upload(fileBase64, {
        folder,
        resource_type: 'auto', // Otomatis deteksi tipe resource (image, video, dll)
      });
      
      this.logger.log(`File berhasil diupload ke Cloudinary: ${result.public_id}`);
      
      // Kembalikan URL secure dari Cloudinary
      return result.secure_url;
    } catch (error) {
      this.logger.error(`Error uploading file to Cloudinary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload file jenis motor ke Cloudinary
   * @param file Buffer file
   * @returns URL gambar yang diupload
   */
  async uploadJenisMotorImage(file: Express.Multer.File): Promise<string> {
    const folder = this.configService.get('cloudinary.jenisMotoFolder');
    return this.uploadFile(file, folder);
  }

  /**
   * Upload file blog ke Cloudinary
   * @param file Buffer file
   * @returns URL gambar yang diupload
   */
  async uploadBlogImage(file: Express.Multer.File): Promise<string> {
    const folder = this.configService.get('cloudinary.blogFolder');
    return this.uploadFile(file, folder);
  }

  /**
   * Hapus file dari Cloudinary berdasarkan URL
   * @param url URL file yang akan dihapus
   */
  async deleteFile(url: string): Promise<void> {
    try {
      // Ekstrak public_id dari URL
      const publicId = this.getPublicIdFromUrl(url);
      
      if (!publicId) {
        this.logger.warn(`Tidak dapat mengekstrak public_id dari URL: ${url}`);
        return;
      }
      
      // Hapus file dari Cloudinary
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        this.logger.log(`File berhasil dihapus dari Cloudinary: ${publicId}`);
      } else {
        this.logger.warn(`Gagal menghapus file dari Cloudinary: ${publicId}, result: ${result.result}`);
      }
    } catch (error) {
      this.logger.error(`Error deleting file from Cloudinary: ${error.message}`);
      // Tidak throw error karena penghapusan file tidak kritis
    }
  }

  /**
   * Ekstrak public_id dari URL Cloudinary
   * @param url URL Cloudinary
   * @returns public_id atau null jika tidak dapat diekstrak
   */
  private getPublicIdFromUrl(url: string): string | null {
    try {
      // URL Cloudinary format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.ext
      const urlParts = url.split('/');
      const filenameParts = urlParts[urlParts.length - 1].split('.');
      
      // Hapus ekstensi file
      filenameParts.pop();
      
      // Gabungkan kembali nama file (untuk handle nama file dengan titik)
      const filename = filenameParts.join('.');
      
      // Dapatkan folder + filename sebagai public_id
      const folderIndex = urlParts.findIndex(part => part === 'upload');
      if (folderIndex === -1) return null;
      
      // Skip 'v1234567890' version part
      const pathParts = urlParts.slice(folderIndex + 2);
      pathParts[pathParts.length - 1] = filename;
      
      return pathParts.join('/');
    } catch (error) {
      this.logger.error(`Error extracting public_id from URL: ${error.message}`);
      return null;
    }
  }
} 