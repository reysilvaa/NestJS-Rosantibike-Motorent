# API Rental Motor

Aplikasi backend untuk layanan rental motor yang menyediakan API untuk pengelolaan unit motor, transaksi sewa, dan fitur administrasi.

## Struktur Proyek

```
backend/
├── prisma/                  # Database schema dan migrations
│   ├── schema.prisma        # Model database
│   ├── seed.ts              # Data seeder
│   └── seed/                # Data seed untuk database
├── src/
│   ├── common/              # Komponen yang digunakan di seluruh aplikasi
│   │   ├── gateway/         # WebSocket gateway untuk real-time updates
│   │   ├── logger/          # Konfigurasi logging
│   │   ├── prisma/          # Prisma service dan utilities
│   │   └── testing/         # Utilitas untuk testing
│   ├── modules/             # Modul fitur aplikasi
│   │   ├── admin/           # Pengelolaan admin
│   │   ├── auth/            # Autentikasi dan otorisasi
│   │   ├── blog/            # Pengelolaan konten blog
│   │   ├── jenis-motor/     # Pengelolaan jenis motor
│   │   ├── redis/           # Integrasi Redis untuk caching
│   │   ├── transaksi/       # Pengelolaan transaksi sewa
│   │   ├── unit-motor/      # Pengelolaan unit motor
│   │   └── whatsapp/        # Integrasi WhatsApp untuk notifikasi
│   ├── config/              # Konfigurasi aplikasi
│   ├── app.module.ts        # Modul utama aplikasi
│   ├── app.controller.ts    # Controller utama
│   ├── app.service.ts       # Service utama
│   └── main.ts              # Entry point aplikasi
├── public/                  # File statis yang dapat diakses publik
├── test/                    # Unit tests dan e2e tests
├── .env                     # Environment variables
└── package.json             # Dependensi dan scripts
```

## Arsitektur Aplikasi

Aplikasi ini dibangun menggunakan arsitektur modular dengan pola Repository dan Service:

- **Controller**: Menangani HTTP requests dan mengirimkan response.
- **Service**: Mengimplementasikan logika bisnis
- **Repository**: Akses data melalui Prisma ORM
- **DTO**: Data Transfer Objects untuk validasi input
- **Entity**: Representasi dari model data

## Alur Aplikasi

1. **Pengelolaan Jenis dan Unit Motor**:
   - Admin dapat menambah, melihat, memperbarui dan menghapus jenis motor
   - Admin dapat menambah, melihat, memperbarui dan menghapus unit motor
   - Unit motor memiliki status (TERSEDIA, DISEWA, DIPESAN, OVERDUE, PERBAIKAN)

2. **Proses Transaksi Sewa**:
   - Periksa ketersediaan unit motor berdasarkan tanggal
   - Buat transaksi baru dengan status AKTIF
   - Ubah status unit motor menjadi DISEWA
   - Kirim notifikasi WhatsApp ke penyewa berisi detail sewa
   - Kirim notifikasi WhatsApp ke admin tentang sewa baru

3. **Penyelesaian Transaksi**:
   - Admin menyelesaikan transaksi
   - Status unit motor diubah menjadi TERSEDIA
   - Status transaksi diubah menjadi SELESAI
   - Kirim notifikasi penyelesaian via WhatsApp

4. **Pengelolaan Blog**:
   - Admin dapat membuat, memperbarui, dan menghapus artikel blog
   - Artikel memiliki status (DRAFT, TERBIT)
   - Artikel dapat dicari berdasarkan tag, kategori, atau keyword

## Teknologi Utama

- **NestJS**: Framework backend
- **PostgreSQL**: Database utama
- **Prisma**: ORM dan database migrations
- **Redis**: Caching dan pub/sub
- **Bull**: Job queuing
- **Socket.io**: Komunikasi real-time
- **JWT**: Autentikasi
- **Swagger**: API documentation

## Instalasi

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

# Jalankan database migrations
npx prisma migrate dev

# Jalankan seed untuk data awal
npx prisma db seed
```

## Menjalankan Aplikasi

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## Pengujian

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## API Endpoints

### 1. Auth

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST   | `/auth/login` | Login admin |

### 2. Admin

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
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
| GET    | `/unit-motor/:id` | Mendapatkan detail unit motor berdasarkan ID |
| POST   | `/unit-motor` | Membuat unit motor baru |
| PATCH  | `/unit-motor/:id` | Memperbarui unit motor |
| DELETE | `/unit-motor/:id` | Menghapus unit motor |

### 5. Transaksi

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET    | `/transaksi` | Mendapatkan semua transaksi |
| GET    | `/transaksi/history` | Mendapatkan history transaksi (selesai/overdue) |
| GET    | `/transaksi/:id` | Mendapatkan detail transaksi berdasarkan ID |
| POST   | `/transaksi` | Membuat transaksi baru |
| PATCH  | `/transaksi/:id` | Memperbarui transaksi |
| DELETE | `/transaksi/:id` | Menghapus transaksi |
| POST   | `/transaksi/:id/selesai` | Menyelesaikan transaksi sewa |

### 6. Blog

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET    | `/blog` | Mendapatkan semua artikel |
| GET    | `/blog/:slug` | Mendapatkan artikel berdasarkan slug |
| POST   | `/blog` | Membuat artikel baru |
| PUT    | `/blog/:id` | Memperbarui artikel |
| DELETE | `/blog/:id` | Menghapus artikel |

### 7. WhatsApp

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST   | `/whatsapp/send` | Kirim pesan WhatsApp |
| POST   | `/whatsapp/send-admin` | Kirim pesan ke admin WhatsApp |
| POST   | `/whatsapp/reset-connection` | Reset koneksi WhatsApp |
| GET    | `/whatsapp/status` | Cek status koneksi WhatsApp |

### 8. Redis Debug

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET    | `/debug/redis` | Operasi debug untuk Redis |

## Parameter API

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
  "accessToken": "string"
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
```

### Jenis Motor API

#### Buat Jenis Motor
```
POST /jenis-motor

Request:
{
  "nama": "string",
  "deskripsi": "string",
  "hargaSewa": number
}
```

### Unit Motor API

#### Filter Unit Motor
```
GET /unit-motor?jenisId=uuid&search=string&status=string
```

#### Buat Unit Motor
```
POST /unit-motor

Request:
{
  "jenisId": "uuid",
  "platNomor": "string",
  "noMesin": "string",
  "tahun": number,
  "warna": "string",
  "status": "TERSEDIA" | "DISEWA" | "PERBAIKAN"
}
```

### Transaksi API

#### Filter Transaksi
```
GET /transaksi?search=string&status=string&tanggalMulai=date&tanggalSelesai=date
```

#### Buat Transaksi
```
POST /transaksi

Request:
{
  "unitMotorId": "uuid",
  "namaPenyewa": "string",
  "nomorKTP": "string",
  "nomorHP": "string",
  "alamat": "string",
  "tanggalMulai": "string" (format: "YYYY-MM-DD"),
  "tanggalSelesai": "string" (format: "YYYY-MM-DD"),
  "biayaSewa": number,
  "deposit": number,
  "catatan": "string" (opsional)
}
```

### Blog API

#### Filter Blog
```
GET /blog?search=string&status=string&tagId=uuid&page=number&limit=number
```

#### Buat Blog
```
POST /blog

Request:
{
  "judul": "string",
  "slug": "string",
  "konten": "string",
  "tags": ["uuid"], // opsional
  "metaTitle": "string", // opsional
  "metaDescription": "string", // opsional
  "featuredImage": "string", // opsional
  "status": "DRAFT" | "PUBLISH"
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
```

## Autentikasi

Sebagian besar endpoint memerlukan autentikasi menggunakan JWT Bearer Token yang didapatkan dari endpoint login.

Header yang diperlukan:
```
Authorization: Bearer [token]
```

## Status Transaksi

- `MENUNGGU` - Transaksi telah dibuat tapi belum diproses
- `BERJALAN` - Transaksi sedang berjalan (motor sedang disewa)
- `SELESAI` - Transaksi telah selesai
- `BATAL` - Transaksi dibatalkan
- `OVERDUE` - Batas waktu transaksi telah berakhir tapi belum dikembalikan

## Dokumentasi API

Proyek ini sudah dilengkapi dengan Swagger UI untuk dokumentasi API yang interaktif.
Anda dapat mengakses Swagger UI di: http://localhost:3000/api/docs

![Swagger UI](https://swagger.io/swagger/media/assets/images/swagger-ui3.png)

## Panduan Pengembang

### Menambahkan Modul Baru

1. Buat modul baru menggunakan NestJS CLI:
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

### Praktik Terbaik

1. Gunakan DTO untuk validasi input
2. Ikuti prinsip SOLID
3. Tulis unit test untuk service dan controller
4. Dokumentasikan API dengan dekorator Swagger
5. Gunakan logging untuk pemantauan
6. Validasi input dengan class-validator

## Lisensi

MIT
