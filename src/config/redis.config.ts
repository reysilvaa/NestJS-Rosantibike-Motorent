import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  ttl: 60 * 60 * 24, // 24 jam dalam detik
  max: 100, // maksimum jumlah item dalam cache
}));
