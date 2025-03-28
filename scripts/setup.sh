#!/bin/bash

# Script untuk melakukan setup awal pada VPS
# Jalankan sekali sebelum deployment pertama

# Lokasi aplikasi
APP_DIR="/var/www/rosantibikemotorent/backend"

echo "===== STARTING INITIAL SETUP $(date) ====="

# Update sistem
apt-get update
apt-get upgrade -y

# Install dependencies dasar
apt-get install -y curl git ca-certificates gnupg lsb-release

# Setup direktori untuk aplikasi jika belum ada
mkdir -p $APP_DIR
mkdir -p $APP_DIR/storage
mkdir -p $APP_DIR/logs

# Setup Docker
echo "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
echo "Installing Docker Compose..."
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/download/v2.20.3/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Verifikasi instalasi
docker --version
docker compose version

# Clone repository jika belum ada
if [ ! -d "$APP_DIR/.git" ]; then
  cd $(dirname $APP_DIR)
  git clone https://github.com/username/repository.git $(basename $APP_DIR)
  cd $APP_DIR
else
  cd $APP_DIR
  git pull
fi

# Setup .env dari .env.example jika belum ada
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "Created .env file from template. PLEASE UPDATE ENVIRONMENT VARIABLES!"
fi

# Deploy dengan Docker
echo "Deploying application with Docker..."
docker compose build
docker compose up -d

# Jalankan database migrations
echo "Running database migrations..."
sleep 10 # Tunggu database siap
docker compose exec -T app npx prisma migrate deploy

# Setup cron untuk cleanup Docker secara berkala
echo "0 2 * * * docker system prune -af --volumes > $APP_DIR/logs/docker-cleanup.log 2>&1" | crontab -

# Setup cron untuk health check
echo "*/5 * * * * curl -f http://localhost:3000/api/health || (cd $APP_DIR && docker compose restart app) > $APP_DIR/logs/health.log 2>&1" | crontab -

# Setup log rotation
cat > /etc/logrotate.d/docker-logs << EOL
$APP_DIR/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 root root
}
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=10M
    missingok
    delaycompress
    copytruncate
}
EOL

echo "===== SETUP COMPLETED $(date) ====="
echo "Next steps:"
echo "1. Update environment variables in .env file"
echo "2. Verify application is running: curl http://localhost:3000/api/health"
echo "3. Setup GitHub repository secrets for auto deployment"
echo "4. Configure server firewall to allow only necessary ports" 