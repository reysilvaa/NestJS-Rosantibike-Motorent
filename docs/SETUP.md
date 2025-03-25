# Pengaturan dan Instalasi Rental Motor API

Dokumen ini berisi panduan lengkap untuk mengatur dan menjalankan API backend Rental Motor.

## Prasyarat

Sebelum memulai, pastikan sistem Anda memiliki:

- Node.js v18 atau lebih baru
- npm v8 atau lebih baru
- PostgreSQL v14 atau lebih baru
- Redis v6 atau lebih baru

## Instalasi

### 1. Clone repositori

```bash
git clone <repository-url>
cd backend
```

### 2. Instal dependensi

```bash
npm install
```

### 3. Konfigurasi environment

Salin file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Edit file `.env` dan sesuaikan dengan konfigurasi lokal Anda:

```
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/rental_motor?schema=public"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="1d"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""

# WhatsApp
WHATSAPP_TOKEN="your-whatsapp-token"
WHATSAPP_NUMBER="your-whatsapp-number"

# Server
PORT=3000
NODE_ENV=development

# Queue
QUEUE_PREFIX="rental_motor"
```

### 4. Setup database

Jalankan perintah berikut untuk mengatur database:

```bash
# Jalankan migrasi database
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Seed database dengan data awal
npx prisma db seed
```

## Menjalankan Aplikasi

### Development Mode

```bash
npm run start:dev
```

Server akan berjalan di [http://localhost:3000](http://localhost:3000)

### Production Mode

```bash
npm run build
npm run start:prod
```

## Struktur Folder dan File

```
├── prisma/
│   ├── schema.prisma        # Skema database
│   ├── migrations/          # Database migrations
│   ├── seed.ts              # Data seeder
│   └── seed/                # Data seed JSON files
├── src/
│   ├── common/              # Shared components
│   │   ├── decorators/      # Custom decorators
│   │   ├── dto/             # Shared DTOs
│   │   ├── filters/         # Exception filters
│   │   ├── guards/          # Authentication guards
│   │   ├── interceptors/    # HTTP interceptors
│   │   ├── interfaces/      # Shared interfaces
│   │   ├── middleware/      # HTTP middleware
│   │   └── utils/           # Utility functions
│   ├── config/              # App configuration
│   ├── modules/             # Feature modules
│   │   ├── admin/           # Admin module
│   │   ├── auth/            # Authentication
│   │   ├── blog/            # Blog management
│   │   ├── jenis-motor/     # Motor types
│   │   ├── redis/           # Redis integration
│   │   ├── transaksi/       # Rental transactions
│   │   ├── unit-motor/      # Motor units
│   │   └── whatsapp/        # WhatsApp integration
│   ├── app.module.ts        # Root module
│   └── main.ts              # Application entry point
└── test/                    # Tests
```

## Database

### ERD (Entity Relationship Diagram)

```
JenisMotor 1--* UnitMotor 1--* TransaksiSewa
BlogPost *--* BlogTag (through BlogPostTag)
```

### Migrasi Database

Untuk membuat migrasi baru setelah mengubah skema:

```bash
npx prisma migrate dev --name "nama_migrasi"
```

### Reset Database

Untuk reset database (menghapus semua data):

```bash
npx prisma migrate reset
```

## Testing

### Unit Testing

```bash
npm run test
```

### E2E Testing

```bash
npm run test:e2e
```

### Coverage Testing

```bash
npm run test:cov
```

## Endpoints API

Server menyediakan dokumentasi interaktif Swagger yang dapat diakses di:
[http://localhost:3000/api/docs](http://localhost:3000/api/docs)

## Pengembangan Modul Baru

### Langkah-langkah membuat modul baru:

1. Buat modul menggunakan NestJS CLI:

```bash
nest g module modules/nama-modul
nest g controller modules/nama-modul
nest g service modules/nama-modul
```

2. Tambahkan model ke `schema.prisma` jika diperlukan
3. Buat DTO untuk validasi input
4. Implementasikan CRUD operations di service
5. Definisikan routes di controller
6. Tambahkan Swagger documentation
7. Buat unit tests

## Monitoring dan Logging

### Monitoring API

Aplikasi dilengkapi dengan endpoint `/health` untuk health checking.

### Logging

Log aplikasi disimpan di:
- Console (development)
- File (production): `logs/app.log`

## Security

- Rate limiting untuk mencegah brute force attacks
- JWT untuk autentikasi
- Request validation untuk mencegah injections
- Helmet untuk header security
- CORS protection

## Deployment

### Docker (Rekomendasi)

Aplikasi menyediakan Dockerfile dan docker-compose.yml untuk deployment mudah:

```bash
# Build dan jalankan container
docker-compose up -d
```

### Manual Deployment

1. Build aplikasi:
```bash
npm run build
```

2. Jalankan di production server:
```bash
NODE_ENV=production node dist/main
```

## Troubleshooting

### Database Connection Issues

Periksa file `.env` dan pastikan `DATABASE_URL` sudah benar.

### Redis Connection Issues

Pastikan Redis server berjalan dan dapat diakses.

### WhatsApp Integration Issues

Periksa token WhatsApp dan nomor telepon di `.env`. 