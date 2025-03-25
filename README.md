# API Rental Motor

Aplikasi backend untuk layanan rental motor yang menyediakan API lengkap untuk pengelolaan unit motor, transaksi sewa, blog, dan fitur administrasi. Dibangun dengan NestJS, PostgreSQL, dan Prisma ORM.

## Daftar Isi
- [Fitur Utama](#fitur-utama)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Struktur Proyek](#struktur-proyek)
- [Persyaratan Sistem](#persyaratan-sistem)
- [Instalasi](#instalasi)
- [Konfigurasi](#konfigurasi)
- [Menjalankan Aplikasi](#menjalankan-aplikasi)
- [Migrasi Database](#migrasi-database)
- [API Endpoints](#api-endpoints)
- [Autentikasi](#autentikasi)
- [Integrasi WhatsApp](#integrasi-whatsapp)
- [Caching dengan Redis](#caching-dengan-redis)
- [Job Queuing](#job-queuing)
- [Websocket](#websocket)
- [Testing](#testing)
- [Dokumentasi API](#dokumentasi-api)
- [Praktik Terbaik](#praktik-terbaik)
- [Troubleshooting](#troubleshooting)
- [Panduan Pengembang](#panduan-pengembang)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

## Fitur Utama

### 1. Manajemen Jenis Motor
- Pengelolaan data merk, model, dan spesifikasi motor
- Penyimpanan informasi harga sewa untuk setiap jenis motor

### 2. Manajemen Unit Motor
- Pencatatan detail setiap unit motor (plat nomor, status, dll)
- Pelacakan status unit motor (tersedia, disewa, dipesan, overdue, atau perbaikan)
- Pengelolaan ketersediaan unit motor untuk disewa

### 3. Transaksi Sewa
- Pembuatan dan pengelolaan transaksi sewa
- Pengecekan ketersediaan unit motor berdasarkan tanggal
- Pelacakan status transaksi (menunggu, berjalan, selesai, batal, atau overdue)
- Penyelesaian transaksi sewa
- Pencatatan riwayat transaksi

### 4. Integrasi WhatsApp
- Notifikasi otomatis via WhatsApp ke penyewa dan admin
- Status koneksi WhatsApp
- Reset koneksi WhatsApp
- Pengiriman pesan WhatsApp manual

### 5. Manajemen Blog
- Penulisan dan publikasi artikel blog
- Pengelolaan kategori dan tag untuk artikel
- Status artikel (draft atau terbit)
- Pencarian artikel berdasarkan tag, kategori, atau keyword

### 6. Manajemen Admin
- Autentikasi admin dengan JWT
- Pengelolaan akun admin (penambahan, perubahan, penghapusan)

### 7. Fitur Tambahan
- Caching dengan Redis untuk performa optimal
- Sistem antrian menggunakan Bull untuk tugas asinkron
- Komunikasi real-time dengan WebSocket/Socket.io
- Dokumentasi API interaktif dengan Swagger

## Teknologi yang Digunakan

### Backend Framework & Runtime
- [NestJS](https://nestjs.com/) - Framework Node.js progresif
- [Node.js](https://nodejs.org/) - JavaScript runtime

### Database & ORM
- [PostgreSQL](https://www.postgresql.org/) - Database relasional
- [Prisma](https://www.prisma.io/) - ORM modern untuk Node.js dan TypeScript

### Caching & Message Queue
- [Redis](https://redis.io/) - In-memory data store untuk caching
- [Bull](https://github.com/OptimalBits/bull) - Queue library berbasis Redis

### Komunikasi & Integrasi
- [Socket.io](https://socket.io/) - Komunikasi real-time
- [Baileys](https://github.com/whiskeysockets/baileys) - Library WhatsApp Web API

### Autentikasi & Keamanan
- [JWT](https://jwt.io/) - JSON Web Token untuk autentikasi
- [Passport](http://www.passportjs.org/) - Authentication middleware
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js) - Password hashing
- [Helmet](https://helmetjs.github.io/) - HTTP header security

### Dokumentasi & Tooling
- [Swagger](https://swagger.io/) - API documentation
- [Jest](https://jestjs.io/) - Testing framework
- [ESLint](https://eslint.org/) - Linting utility
- [Prettier](https://prettier.io/) - Code formatter

## Struktur Proyek
Proyek ini mengikuti struktur folder yang konsisten untuk memudahkan pengembangan:

```
backend/
├── src/                      # Kode sumber utama
│   ├── common/               # Utilitas, helper, dan komponen yang dapat digunakan kembali
│   ├── config/               # File konfigurasi aplikasi
│   ├── modules/              # Modul aplikasi terorganisasi berdasarkan fitur
│   │   ├── admin/            # Modul pengelolaan admin
│   │   ├── auth/             # Modul autentikasi
│   │   ├── blog/             # Modul pengelolaan blog
│   │   ├── jenis-motor/      # Modul pengelolaan jenis motor
│   │   ├── redis/            # Modul pengelolaan Redis
│   │   ├── transaksi/        # Modul pengelolaan transaksi sewa
│   │   ├── unit-motor/       # Modul pengelolaan unit motor
│   │   └── whatsapp/         # Modul integrasi WhatsApp
│   ├── app.controller.ts     # Controller aplikasi utama
│   ├── app.module.ts         # Modul aplikasi utama 
│   ├── app.service.ts        # Service aplikasi utama
│   └── main.ts               # File entrypoint aplikasi
├── prisma/                   # Prisma schema dan migrasi
│   ├── schema.prisma         # Schema database Prisma
│   ├── seed.ts               # Script untuk seeding database
│   └── seed/                 # Data seed
├── dist/                     # Output build (hasil kompilasi)
├── test/                     # E2E tests
├── docs/                     # Dokumentasi
├── public/                   # Assets publik
├── storage/                  # Penyimpanan file (uploads, sessions, dll)
│   └── whatsapp-sessions/    # Penyimpanan sesi WhatsApp
├── scripts/                  # Script utilitas
├── package.json              # Dependensi dan script NPM
├── tsconfig.json             # Konfigurasi TypeScript
├── .env                      # File konfigurasi environment
└── .env.example              # Contoh file konfigurasi environment
```

### Standar Penamaan

- File: `kebab-case.ts` (contoh: `auth-service.ts`)
- Kelas: `PascalCase` (contoh: `UserService`)  
- Fungsi/Metode: `camelCase` (contoh: `getUserById()`)
- Konstanta: `SCREAMING_SNAKE_CASE` (contoh: `MAX_LOGIN_ATTEMPTS`)
- Variabel: `camelCase` (contoh: `userId`)

### Struktur Modul
Setiap modul harus berisi file-file berikut:
- `[module].module.ts`: Definisi modul
- `[module].controller.ts`: Controller REST API
- `[module].service.ts`: Logic dan business rules
- `dto/`: Directory untuk DTO yang digunakan di controller
- `__tests__/`: Unit tests untuk modul

Struktur ini memastikan konsistensi di seluruh proyek dan memudahkan pemeliharaan jangka panjang.

## Persyaratan Sistem

Sebelum instalasi, pastikan sistem anda memenuhi persyaratan berikut:

- Node.js (versi 16.x atau lebih baru)
- npm (versi 8.x atau lebih baru)
- PostgreSQL (versi 12.x atau lebih baru)
- Redis (versi 6.x atau lebih baru)

## Instalasi

### Menggunakan Git

```bash
# Clone repositori
git clone <repository-url>

# Masuk ke direktori proyek
cd backend

# Install dependensi
npm install

# Siapkan file environment
cp .env.example .env

# Edit .env sesuai kebutuhan
# Sesuaikan DATABASE_URL, REDIS_HOST, dll.

# Jalankan database migrations
npx prisma migrate dev

# Jalankan seed untuk data awal
npx prisma db seed
```

### Menggunakan Docker

```bash
# Clone repositori
git clone <repository-url>

# Masuk ke direktori proyek
cd backend

# Jalankan dengan Docker Compose
docker-compose up -d
```

## Konfigurasi

Aplikasi menggunakan file `.env` untuk konfigurasi. Berikut adalah daftar variabel yang tersedia:

### Database Configuration
```
DATABASE_URL="postgresql://username:password@localhost:5432/rental_motor?schema=public"
```

### JWT Configuration
```
JWT_SECRET="rahasia-aman-untuk-jwt-authentication"
JWT_EXPIRES_IN="7d"
```

### Redis Configuration
```
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""
```

### BullMQ Configuration
```
QUEUE_PREFIX="rental_motor"
```

### Server Configuration
```
PORT=3000
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"
```

### Rate Limiting
```
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

### Compression
```
COMPRESSION_LEVEL=6
```

### Baileys WhatsApp Configuration
```
BAILEYS_SESSION_PATH="./storage/whatsapp-sessions"
ADMIN_WHATSAPP_NUMBER="6281234567890"
```

## Menjalankan Aplikasi

```bash
# Development mode
npm run start:dev

# Debug mode
npm run start:debug

# Production mode
npm run build
npm run start:prod

# Menjalankan Prisma Studio (UI untuk database)
npm run prisma:studio
```

## Migrasi Database

```bash
# Membuat migrasi baru berdasarkan perubahan schema
npx prisma migrate dev --name "nama_migrasi"

# Menerapkan migrasi ke database
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Melihat dan mengedit data dengan Prisma Studio
npx prisma studio
```

## API Endpoints

### 1. Auth

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST   | `/auth/login` | Login admin |
| GET    | `/auth/profile` | Mendapatkan profil admin yang sedang login |
| POST   | `/auth/refresh` | Memperbarui token JWT |

### 2. Admin

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET    | `/admin` | Mendapatkan daftar admin |
| GET    | `/admin/:id` | Mendapatkan detail admin berdasarkan ID |
| POST   | `/admin` | Buat admin baru |
| PUT    | `/admin/:id` | Update admin |
| DELETE | `/admin/:id` | Hapus admin |

### 3. Jenis Motor

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET    | `/jenis-motor` | Mendapatkan semua jenis motor |
| GET    | `/jenis-motor/:id` | Mendapatkan detail jenis motor berdasarkan ID |
| POST   | `/jenis-motor` | Membuat jenis motor baru |
| PATCH  | `/jenis-motor/:id` | Memperbarui jenis motor |
| DELETE | `/jenis-motor/:id` | Menghapus jenis motor |

### 4. Unit Motor

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET    | `/unit-motor` | Mendapatkan semua unit motor |
| GET    | `/unit-motor/available` | Mendapatkan unit motor yang tersedia |
| GET    | `/unit-motor/:id` | Mendapatkan detail unit motor berdasarkan ID |
| POST   | `/unit-motor` | Membuat unit motor baru |
| PATCH  | `/unit-motor/:id` | Memperbarui unit motor |
| PATCH  | `/unit-motor/:id/status` | Memperbarui status unit motor |
| DELETE | `/unit-motor/:id` | Menghapus unit motor |

### 5. Transaksi

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET    | `/transaksi` | Mendapatkan semua transaksi |
| GET    | `/transaksi/active` | Mendapatkan transaksi aktif |
| GET    | `/transaksi/history` | Mendapatkan history transaksi (selesai/overdue) |
| GET    | `/transaksi/:id` | Mendapatkan detail transaksi berdasarkan ID |
| POST   | `/transaksi` | Membuat transaksi baru |
| PATCH  | `/transaksi/:id` | Memperbarui transaksi |
| DELETE | `/transaksi/:id` | Menghapus transaksi |
| POST   | `/transaksi/:id/selesai` | Menyelesaikan transaksi sewa |
| POST   | `/transaksi/:id/batal` | Membatalkan transaksi sewa |

### 6. Blog

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET    | `/blog` | Mendapatkan semua artikel |
| GET    | `/blog/featured` | Mendapatkan artikel unggulan |
| GET    | `/blog/tags` | Mendapatkan semua tag blog |
| GET    | `/blog/tags/:id` | Mendapatkan detail tag berdasarkan ID |
| GET    | `/blog/:slug` | Mendapatkan artikel berdasarkan slug |
| POST   | `/blog` | Membuat artikel baru |
| PUT    | `/blog/:id` | Memperbarui artikel |
| PATCH  | `/blog/:id/status` | Memperbarui status artikel |
| DELETE | `/blog/:id` | Menghapus artikel |
| POST   | `/blog/tags` | Membuat tag baru |
| DELETE | `/blog/tags/:id` | Menghapus tag |

### 7. WhatsApp

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST   | `/whatsapp/send` | Kirim pesan WhatsApp |
| POST   | `/whatsapp/send-admin` | Kirim pesan ke admin WhatsApp |
| POST   | `/whatsapp/reset-connection` | Reset koneksi WhatsApp |
| GET    | `/whatsapp/status` | Cek status koneksi WhatsApp |
| GET    | `/whatsapp/qr` | Mendapatkan QR code untuk koneksi WhatsApp |

### 8. Redis Debug

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET    | `/debug/redis` | Operasi debug untuk Redis |
| GET    | `/debug/redis/keys` | Daftar keys di Redis |
| DELETE | `/debug/redis/flush` | Menghapus semua data di Redis |

## Parameter API Detail

### Auth API

#### Login
```
POST /auth/login

Request:
{
  "username": "string",
  "password": "string"
}

Response:
{
  "accessToken": "string",
  "expiresIn": number,
  "admin": {
    "id": "string",
    "username": "string",
    "nama": "string"
  }
}
```

### Admin API

#### Buat Admin
```
POST /admin

Request:
{
  "username": "string",
  "password": "string", 
  "nama": "string"
}

Response:
{
  "id": "string",
  "username": "string",
  "nama": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### Update Admin
```
PUT /admin/:id

Request:
{
  "username": "string", // opsional
  "password": "string", // opsional
  "nama": "string"      // opsional
}

Response:
{
  "id": "string",
  "username": "string",
  "nama": "string",
  "updatedAt": "string"
}
```

### Jenis Motor API

#### Buat Jenis Motor
```
POST /jenis-motor

Request:
{
  "merk": "string",
  "model": "string",
  "cc": number
}

Response:
{
  "id": "string",
  "merk": "string",
  "model": "string",
  "cc": number,
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Unit Motor API

#### Filter Unit Motor
```
GET /unit-motor?jenisId=uuid&search=string&status=string

Response:
{
  "data": [
    {
      "id": "string",
      "jenisId": "string",
      "platNomor": "string",
      "status": "TERSEDIA" | "DISEWA" | "DIPESAN" | "OVERDUE",
      "hargaSewa": number,
      "createdAt": "string",
      "updatedAt": "string",
      "jenis": {
        "id": "string",
        "merk": "string",
        "model": "string",
        "cc": number
      }
    }
  ],
  "total": number,
  "page": number,
  "limit": number
}
```

#### Buat Unit Motor
```
POST /unit-motor

Request:
{
  "jenisId": "uuid",
  "platNomor": "string",
  "hargaSewa": number,
  "status": "TERSEDIA" | "DISEWA" | "DIPESAN" | "OVERDUE"
}

Response:
{
  "id": "string",
  "jenisId": "string",
  "platNomor": "string",
  "status": "TERSEDIA" | "DISEWA" | "DIPESAN" | "OVERDUE",
  "hargaSewa": number,
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Transaksi API

#### Filter Transaksi
```
GET /transaksi?search=string&status=string&tanggalMulai=date&tanggalSelesai=date

Response:
{
  "data": [
    {
      "id": "string",
      "namaPenyewa": "string",
      "noWhatsapp": "string",
      "unitId": "string",
      "tanggalMulai": "string",
      "tanggalSelesai": "string",
      "status": "AKTIF" | "SELESAI" | "OVERDUE",
      "totalBiaya": number,
      "createdAt": "string",
      "updatedAt": "string",
      "unitMotor": {
        "id": "string",
        "platNomor": "string",
        "jenis": {
          "merk": "string",
          "model": "string"
        }
      }
    }
  ],
  "total": number,
  "page": number,
  "limit": number
}
```

#### Buat Transaksi
```
POST /transaksi

Request:
{
  "unitId": "uuid",
  "namaPenyewa": "string",
  "noWhatsapp": "string",
  "tanggalMulai": "string" (format: "YYYY-MM-DD"),
  "tanggalSelesai": "string" (format: "YYYY-MM-DD"),
  "totalBiaya": number
}

Response:
{
  "id": "string",
  "namaPenyewa": "string",
  "noWhatsapp": "string",
  "unitId": "string",
  "tanggalMulai": "string",
  "tanggalSelesai": "string",
  "status": "AKTIF",
  "totalBiaya": number,
  "createdAt": "string",
  "updatedAt": "string",
  "unitMotor": {
    "id": "string",
    "platNomor": "string",
    "status": "DISEWA",
    "jenis": {
      "merk": "string",
      "model": "string"
    }
  }
}
```

### Blog API

#### Filter Blog
```
GET /blog?search=string&status=string&kategori=string&page=number&limit=number

Response:
{
  "data": [
    {
      "id": "string",
      "judul": "string",
      "slug": "string",
      "konten": "string",
      "thumbnail": "string",
      "kategori": "string",
      "status": "DRAFT" | "TERBIT",
      "createdAt": "string",
      "updatedAt": "string",
      "tags": [
        {
          "id": "string",
          "nama": "string"
        }
      ]
    }
  ],
  "total": number,
  "page": number,
  "limit": number
}
```

#### Buat Blog
```
POST /blog

Request:
{
  "judul": "string",
  "slug": "string",
  "konten": "string",
  "thumbnail": "string", // opsional
  "kategori": "string",
  "tags": ["uuid"], // opsional
  "status": "DRAFT" | "TERBIT"
}

Response:
{
  "id": "string",
  "judul": "string",
  "slug": "string",
  "konten": "string",
  "thumbnail": "string",
  "kategori": "string",
  "status": "DRAFT" | "TERBIT",
  "createdAt": "string",
  "updatedAt": "string",
  "tags": [
    {
      "id": "string",
      "nama": "string"
    }
  ]
}
```

### WhatsApp API

#### Kirim Pesan
```
POST /whatsapp/send

Request:
{
  "to": "string" (format: "628xxxxx"),
  "message": "string"
}

Response:
{
  "success": true,
  "message": "Pesan berhasil dikirim"
}
```

## Autentikasi

Sebagian besar endpoint memerlukan autentikasi menggunakan JWT Bearer Token yang didapatkan dari endpoint login.

Header yang diperlukan:
```
Authorization: Bearer [token]
```

### Alur Autentikasi:

1. Lakukan login dengan username dan password melalui endpoint `/auth/login`
2. Simpan token JWT yang didapatkan dari respons
3. Sertakan token pada header `Authorization` untuk setiap permintaan API
4. Token kadaluarsa setelah periode tertentu (default: 7 hari)
5. Gunakan endpoint `/auth/refresh` untuk memperpanjang token

## Integrasi WhatsApp

Aplikasi ini menggunakan Baileys untuk terintegrasi dengan WhatsApp. Fitur yang tersedia:

1. **Kirim Pesan Notifikasi**: Secara otomatis mengirimkan notifikasi terkait transaksi
2. **Status Koneksi**: Memeriksa status koneksi WhatsApp
3. **QR Code Login**: Mendapatkan QR code untuk memulai sesi WhatsApp
4. **Reset Koneksi**: Mereset koneksi WhatsApp jika terjadi masalah

### Setup WhatsApp:

1. Buka endpoint `/whatsapp/qr` pada browser
2. Scan QR code menggunakan aplikasi WhatsApp di handphone
3. Koneksi berhasil jika status endpoint `/whatsapp/status` menunjukkan "connected"

## Caching dengan Redis

Aplikasi menggunakan Redis untuk caching data. Ini meningkatkan performa dengan menyimpan data yang sering diakses dalam memori.

Beberapa data yang di-cache:
- Jenis motor
- Unit motor tersedia
- Artikel blog populer
- Data dashboard

Cache otomatis di-invalidate ketika data berubah.

## Job Queuing

Aplikasi menggunakan Bull untuk menangani tugas asinkron, seperti:
- Pengiriman notifikasi WhatsApp
- Pemrosesan transaksi dengan volume tinggi
- Tugas terjadwal seperti pengecekan transaksi overdue

## Websocket

Aplikasi menyediakan komunikasi real-time melalui Socket.io untuk:
- Status koneksi WhatsApp
- Notifikasi transaksi baru
- Dashboard updates

## Testing

```bash
# Unit tests
npm run test

# Unit tests dengan watch mode
npm run test:watch

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Dokumentasi API

Proyek ini sudah dilengkapi dengan Swagger UI untuk dokumentasi API yang interaktif.
Anda dapat mengakses Swagger UI di: http://localhost:3000/api/docs

![Swagger UI](https://swagger.io/swagger/media/assets/images/swagger-ui3.png)

## Status Entity

### Status Motor
- `TERSEDIA` - Motor tersedia untuk disewa
- `DISEWA` - Motor sedang disewa
- `DIPESAN` - Motor telah dipesan tapi belum disewa
- `OVERDUE` - Motor belum dikembalikan melewati batas waktu

### Status Transaksi
- `AKTIF` - Transaksi sedang berjalan (motor sedang disewa)
- `SELESAI` - Transaksi telah selesai
- `OVERDUE` - Batas waktu transaksi telah berakhir tapi belum dikembalikan

### Status Artikel
- `DRAFT` - Artikel masih dalam proses penulisan
- `TERBIT` - Artikel telah dipublikasikan

## Praktik Terbaik

1. **Validasi Input**: Gunakan DTO (Data Transfer Objects) untuk validasi input
2. **Prinsip SOLID**: Ikuti prinsip SOLID dalam pengembangan
3. **Testing**: Tulis unit test untuk service dan controller
4. **Dokumentasi API**: Dokumentasikan API dengan dekorator Swagger
5. **Logging**: Gunakan logging untuk pemantauan
6. **Pengelolaan Error**: Tangani error dengan baik menggunakan exception filters
7. **Cache Invalidation**: Hapus cache ketika data berubah
8. **Rate Limiting**: Terapkan rate limiting untuk mencegah abuse
9. **Security Headers**: Gunakan helmet untuk keamanan HTTP header

## Troubleshooting

### Koneksi Database
- Pastikan PostgreSQL berjalan
- Verifikasi DATABASE_URL di file .env
- Jalankan `npx prisma db push` untuk memverifikasi koneksi

### Koneksi Redis
- Pastikan Redis server berjalan
- Verifikasi REDIS_HOST dan REDIS_PORT di file .env

### Koneksi WhatsApp
- Jika QR code tidak muncul, coba reset koneksi dengan endpoint `/whatsapp/reset-connection`
- Periksa logs untuk error detail
- Pastikan folder session WhatsApp (`./storage/whatsapp-sessions`) memiliki izin yang tepat

### Error Umum
- `PrismaClientInitializationError`: Periksa koneksi database
- `Error: connect ECONNREFUSED`: Redis server tidak berjalan
- `ValidationError`: Format request tidak valid, periksa dokumentasi API

## Panduan Pengembang

### Menambahkan Modul Baru

1. Buat modul baru menggunakan NestJS CLI:
   ```bash
   npm run scaffold:module -- nama-modul
   ```
   
   Atau secara manual:
   ```bash
   nest g module modules/nama-modul
   nest g controller modules/nama-modul
   nest g service modules/nama-modul
   ```

2. Tambahkan model ke schema.prisma jika diperlukan

3. Jalankan migration:
   ```bash
   npx prisma migrate dev --name "add_nama_feature"
   ```

4. Import modul ke app.module.ts

### Memeriksa Struktur Proyek

```bash
npm run check:structure
```

Perintah ini akan memeriksa apakah semua modul mengikuti standar struktur proyek. Jika ada yang tidak sesuai, jalankan:

```bash
npm run fix:structure
```

### Upgrade Dependencies

Selalu periksa vulnerabilitas dan update dependencies:

```bash
npm audit
npm update
```

## Kontribusi

Silakan membaca [CONTRIBUTING.md](CONTRIBUTING.md) untuk detail tentang proses kontribusi ke proyek.

## Lisensi

MIT
