import { BadRequestException } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

/**
 * Membuat interceptor untuk upload file dengan AnyFilesInterceptor
 * Mendukung multiple field name ('file', 'gambar', 'image')
 * Dengan batasan ukuran 5MB dan hanya menerima format gambar
 */
export const createFileUploadInterceptor = () => {
  return AnyFilesInterceptor({
    storage: memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
      if (!file) {
        // Tidak ada file gambar, itu ok
        return cb(null, true);
      }
      if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
        return cb(new BadRequestException('Hanya file gambar yang diperbolehkan!'), false);
      }
      cb(null, true);
    },
  });
};

/**
 * Mendapatkan file pertama dari array files
 * @param files Array files dari Multer
 * @param throwIfEmpty Throw exception jika tidak ada file (default: true)
 * @returns File pertama dari array
 */
export const getFirstFile = (files: Express.Multer.File[], throwIfEmpty = true) => {
  if (!files || files.length === 0) {
    if (throwIfEmpty) {
      throw new BadRequestException('Tidak ada file yang dikirim');
    }
    return null;
  }
  
  return files[0];
};

/**
 * Mendapatkan info file dalam format log
 * @param file File dari Multer
 * @returns String info file
 */
export const getFileInfo = (file: Express.Multer.File) => {
  if (!file) return 'No file';
  return `File info: ${file.originalname}, size: ${file.size}, mimetype: ${file.mimetype}, fieldname: ${file.fieldname}`;
}; 