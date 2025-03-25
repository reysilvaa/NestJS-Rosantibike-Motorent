# API Dokumentasi Rental Motor

## Swagger API Documentation

Proyek ini sudah dilengkapi dengan Swagger UI untuk dokumentasi API yang interaktif.
Anda dapat mengakses Swagger UI di: http://localhost:3000/api/docs

![Swagger UI](https://swagger.io/swagger/media/assets/images/swagger-ui3.png)

## Daftar API Endpoints

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
