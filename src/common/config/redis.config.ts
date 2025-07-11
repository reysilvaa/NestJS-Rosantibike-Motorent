/**
 * Konfigurasi Redis untuk aplikasi
 * 
 * File ini berisi konfigurasi untuk koneksi Redis yang digunakan
 * untuk caching dan penyimpanan data sementara
 */
import { registerAs } from '@nestjs/config';

/**
 * Konfigurasi Redis yang diambil dari environment variables
 * dengan nilai default yang sesuai untuk pengembangan lokal
 */
export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  ttl: 60 * 60 * 24, // 24 jam dalam detik
  max: 100, // Maksimum item dalam cache
}));
