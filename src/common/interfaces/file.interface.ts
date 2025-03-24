import type { FileType } from '../enums/app.enum';

export interface FileMetadata {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  type: FileType;
  path?: string;
  url?: string;
  encoding?: string;
  destination?: string;
  fieldname?: string;
  buffer?: Buffer;
  stream?: NodeJS.ReadableStream;
}

export interface FileUploadResponse {
  success: boolean;
  data?: FileMetadata;
  error?: string;
}
