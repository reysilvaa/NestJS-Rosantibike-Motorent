#!/bin/bash

# Script untuk manual deployment
# Usage: ./scripts/deploy.sh [--no-cache]

# Lokasi aplikasi
APP_DIR="/var/www/rosantibikemotorent/backend"

# Log semua output
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
LOG_FILE="$APP_DIR/logs/deploy_$TIMESTAMP.log"
mkdir -p "$APP_DIR/logs"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "===== STARTING DEPLOYMENT $(date) ====="

# Masuk ke direktori aplikasi
cd $APP_DIR || exit 1

# Backup file .env (jika ada perubahan di repo)
if [ -f .env ]; then
  cp .env .env.backup.$TIMESTAMP
  echo "Backed up .env file to .env.backup.$TIMESTAMP"
fi

# Pull perubahan terbaru dari repository
echo "Pulling latest changes..."
git pull

# Restore file .env jika perlu
if [ -f .env.backup.$TIMESTAMP ]; then
  cp .env.backup.$TIMESTAMP .env
  echo "Restored .env file"
fi

# Set executable permissions untuk scripts
chmod +x scripts/*.sh

# Build Docker image
echo "Building Docker containers..."
if [ "$1" == "--no-cache" ]; then
  echo "Building without cache..."
  docker compose build --no-cache
else
  docker compose build
fi

# Deploy dengan Docker
echo "Starting containers..."
docker compose down
docker compose up -d

# Tunggu database siap
echo "Waiting for database to be ready..."
sleep 10

# Jalankan database migrations
echo "Running database migrations..."
docker compose exec -T app npx prisma migrate deploy

# Cleanup Docker
echo "Cleaning up Docker resources..."
docker system prune -f

# Tampilkan status container
echo "Container status:"
docker compose ps

# Menjalankan health check
echo "Running health check..."
HEALTH_ENDPOINT="http://localhost:3000/api/health"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_ENDPOINT)

if [ "$HEALTH_STATUS" -eq 200 ]; then
  echo "Health check passed: $HEALTH_STATUS"
else
  echo "WARNING: Health check failed with status: $HEALTH_STATUS"
fi

echo "===== DEPLOYMENT COMPLETED $(date) ====="
echo "Deployment log saved to: $LOG_FILE" 