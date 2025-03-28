#!/bin/bash

# Script untuk membersihkan VPS secara berkala
# Tambahkan ke crontab: 0 2 * * * /var/www/rosantibikemotorent/backend/scripts/cleanup.sh

# Buat direktori logs jika belum ada
APP_DIR="/var/www/rosantibikemotorent/backend"
mkdir -p $APP_DIR/logs

# Log start
echo "$(date): Starting cleanup process" >> $APP_DIR/logs/cleanup.log

# Bersihkan container yang tidak digunakan
echo "Cleaning unused containers..."
docker container prune -f

# Bersihkan images yang tidak digunakan
echo "Cleaning unused images..."
docker image prune -a -f

# Bersihkan volumes yang tidak digunakan
echo "Cleaning unused volumes..."
docker volume prune -f

# Bersihkan networks yang tidak digunakan
echo "Cleaning unused networks..."
docker network prune -f

# Jalankan system prune
echo "Running system prune..."
docker system prune -af

# Hapus file log yang lebih dari 7 hari
echo "Removing old log files..."
find $APP_DIR/logs -name "*.log" -type f -mtime +7 -delete

# Bersihkan temporary files
echo "Cleaning temporary files..."
rm -rf /tmp/* /var/tmp/*

# Hapus file backup yang lebih dari 30 hari
echo "Removing old database backups..."
find $APP_DIR -name "backup_*.sql" -type f -mtime +30 -delete

# Hapus file .env.backup yang lama
find $APP_DIR -name ".env.backup.*" -type f -mtime +7 -delete

# Log finish
echo "$(date): Cleanup completed" >> $APP_DIR/logs/cleanup.log

# Tampilkan penggunaan disk sekarang
df -h | tee -a $APP_DIR/logs/cleanup.log 