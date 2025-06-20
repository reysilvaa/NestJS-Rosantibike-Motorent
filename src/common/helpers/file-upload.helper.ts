import { BadRequestException } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

export const createFileUploadInterceptor = () => {
  return AnyFilesInterceptor({
    storage: memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
      if (!file) {
        return cb(null, true);
      }
      if (!/^image\/(jpg|jpeg|png|gif|webp)$/.test(file.mimetype)) {
        return cb(new BadRequestException('Hanya file gambar yang diperbolehkan!'), false);
      }
      cb(null, true);
    },
  });
};

export const getFirstFile = (files: Express.Multer.File[], throwIfEmpty = true) => {
  if (!files || files.length === 0) {
    if (throwIfEmpty) {
      throw new BadRequestException('Tidak ada file yang dikirim');
    }
    return null;
  }

  return files[0];
};

export const getFileInfo = (file: Express.Multer.File) => {
  if (!file) return 'No file';
  return `File info: ${file.originalname}, size: ${file.size}, mimetype: ${file.mimetype}, fieldname: ${file.fieldname}`;
};
