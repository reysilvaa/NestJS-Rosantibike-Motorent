import { registerAs } from '@nestjs/config';

export default registerAs('cloudinary', () => ({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  folder: process.env.CLOUDINARY_FOLDER || 'rental-motor',
  jenisMotoFolder: process.env.CLOUDINARY_JENIS_MOTOR_FOLDER || 'rental-motor/jenis-motor',
  blogFolder: process.env.CLOUDINARY_BLOG_FOLDER || 'rental-motor/blog',
}));
