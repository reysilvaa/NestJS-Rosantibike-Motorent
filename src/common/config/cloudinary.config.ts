import { registerAs } from '@nestjs/config';

export const CLOUDINARY_CONFIG = registerAs('cloudinary', () => ({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  folder: process.env.CLOUDINARY_FOLDER || 'rosantibikemotorent',
  jenisMotoFolder: process.env.CLOUDINARY_JENIS_MOTOR_FOLDER || 'rosantibikemotorent/jenis-motor',
  blogFolder: process.env.CLOUDINARY_BLOG_FOLDER || 'rosantibikemotorent/blog',
}));

export default CLOUDINARY_CONFIG;
