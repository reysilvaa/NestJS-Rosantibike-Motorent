# Panduan Deployment API Rosantibike Motorent

Panduan ini menjelaskan cara men-deploy API ke VPS dengan RAM 1GB dan penyimpanan 20GB menggunakan Docker.

## Persiapan Server

### 1. Setup Server

```bash
# Login ke server
ssh root@your_server_ip

# Clone repository (jika belum)
git clone https://github.com/username/repository.git /var/www/rosantibikemotorent/backend

# Masuk ke direktori aplikasi
cd /var/www/rosantibikemotorent/backend

# Jalankan script setup (ini akan install Docker, clone repo, dan setup container)
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 2. Konfigurasi Environment Variables

```bash
# Edit file .env
nano .env
```

Pastikan untuk mengisi nilai yang benar untuk:

- `DATABASE_URL`
- `JWT_SECRET`
- `APP_PORT` (default: 3000)

Setelah mengubah .env, restart container:

```bash
docker compose down
docker compose up -d
```

### 3. Setup GitHub Secrets untuk Auto Deployment

Di repository GitHub, tambahkan secrets berikut di Settings -> Secrets and variables -> Actions:

- `SSH_HOST`: IP server VPS
- `SSH_USERNAME`: Username untuk login (biasanya `root`)
- `SSH_PRIVATE_KEY`: Private key untuk SSH (isi dengan output dari `cat ~/.ssh/id_rsa`)
- `SSH_PORT`: Port SSH (biasanya `22`)

## Metode Deployment

### 1. Auto Deployment dengan GitHub Actions

Setiap kali Anda push ke branch `main` atau `master`, GitHub Actions akan otomatis men-deploy aplikasi:

1. Pull perubahan terbaru dari repository
2. Build container Docker dengan perubahan terbaru
3. Start container dengan Docker Compose
4. Jalankan database migrations
5. Cleanup unused Docker resources

### 2. Manual Deployment

Jika ingin deploy secara manual:

```bash
# Login ke server
ssh root@your_server_ip

# Masuk ke direktori aplikasi
cd /var/www/rosantibikemotorent/backend

# Pull perubahan terbaru
git pull

# Deploy ulang dengan Docker
docker compose down
docker compose build --no-cache
docker compose up -d

# Jalankan migrations
docker compose exec app npx prisma migrate deploy
```

## Monitoring & Maintenance

### Melihat Logs Container

```bash
# Log aplikasi
docker compose logs app

# Log database
docker compose logs db

# Log redis
docker compose logs redis

# Follow logs realtime
docker compose logs -f app
```

### Restart Container

```bash
docker compose restart app
```

### Melihat Status Container

```bash
docker compose ps
```

### Pembersihan Disk

Pembersihan disk otomatis berjalan setiap hari pukul 2 pagi. Untuk menjalankan secara manual:

```bash
docker system prune -af --volumes
```

## Optimasi untuk VPS 1GB RAM

Konfigurasi sudah dioptimalkan untuk VPS dengan RAM 1GB:

1. **Docker Containers**: Resource limits untuk setiap container
2. **PostgreSQL**: Dikonfigurasi dengan shared_buffers=128MB dan max_connections=100
3. **Redis**: Dibatasi maksimum 100MB memory dengan kebijakan LRU

Total alokasi RAM:

- API: ~500MB
- PostgreSQL: ~300MB
- Redis: ~150MB

## Health Check

Health check otomatis berjalan setiap 5 menit. Jika API tidak merespons, container akan otomatis direstart.

## Backup Database

Untuk backup database:

```bash
# Backup database
docker compose exec db pg_dump -U postgres rental_db_rosantibike_motorent > backup_$(date +%Y%m%d).sql

# Restore database
cat backup_20250328.sql | docker compose exec -T db psql -U postgres rental_db_rosantibike_motorent
```

## Troubleshooting

### Container Crash

```bash
# Cek status container
docker compose ps

# Lihat log untuk melihat error
docker compose logs app

# Restart container
docker compose restart app
```

### Disk Penuh

```bash
# Cek penggunaan disk
df -h

# Bersihkan resources Docker yang tidak terpakai
docker system prune -af --volumes
```

### Database Error

```bash
# Cek status PostgreSQL
docker compose exec db pg_isready

# Restart database container
docker compose restart db
```

### Akses API dari Luar

Pastikan port 3000 terbuka di firewall:

```bash
# Menggunakan ufw
ufw allow 3000/tcp

# Menggunakan iptables
iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```
