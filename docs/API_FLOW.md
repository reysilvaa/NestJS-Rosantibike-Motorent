# Alur API Rental Motor

Dokumen ini menjelaskan alur penggunaan API untuk berbagai kasus penggunaan dalam aplikasi Rental Motor.

## Diagram Alur Utama

![Diagram Alur API](https://firebasestorage.googleapis.com/v0/b/pictdld.appspot.com/o/api-flow.png?alt=media&token=f3c0d453-b8d5-4e01-a855-26f4b9ce6fe0)

## 1. Autentikasi Admin

### Login Admin

1. **Request**:

   ```http
   POST /auth/login
   Content-Type: application/json

   {
     "username": "admin",
     "password": "password123"
   }
   ```

2. **Response Success**:

   ```json
   {
     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "expiresIn": 3600
   }
   ```

3. **Response Error**:
   ```json
   {
     "statusCode": 401,
     "message": "Unauthorized",
     "error": "Invalid credentials"
   }
   ```

## 2. Manajemen Jenis Motor

### Mendapatkan Daftar Jenis Motor

1. **Request**:

   ```http
   GET /jenis-motor
   Authorization: Bearer {access_token}
   ```

2. **Response**:
   ```json
   {
     "data": [
       {
         "id": "uuid-1",
         "merk": "Honda",
         "model": "Vario",
         "cc": 125
       },
       {
         "id": "uuid-2",
         "merk": "Yamaha",
         "model": "NMAX",
         "cc": 155
       }
     ],
     "meta": {
       "total": 2,
       "page": 1,
       "limit": 10
     }
   }
   ```

### Membuat Jenis Motor Baru

1. **Request**:

   ```http
   POST /jenis-motor
   Authorization: Bearer {access_token}
   Content-Type: application/json

   {
     "merk": "Suzuki",
     "model": "Address",
     "cc": 110
   }
   ```

2. **Response Success**:
   ```json
   {
     "id": "uuid-3",
     "merk": "Suzuki",
     "model": "Address",
     "cc": 110,
     "createdAt": "2025-03-25T12:00:00Z",
     "updatedAt": "2025-03-25T12:00:00Z"
   }
   ```

## 3. Manajemen Unit Motor

### Mendapatkan Daftar Unit Motor

1. **Request**:

   ```http
   GET /unit-motor?status=TERSEDIA
   Authorization: Bearer {access_token}
   ```

2. **Response**:
   ```json
   {
     "data": [
       {
         "id": "unit-id-1",
         "platNomor": "AB 1234 XY",
         "status": "TERSEDIA",
         "hargaSewa": 100000,
         "jenis": {
           "id": "jenis-id-1",
           "merk": "Honda",
           "model": "Vario",
           "cc": 125
         }
       }
     ],
     "meta": {
       "total": 1,
       "page": 1,
       "limit": 10
     }
   }
   ```

### Membuat Unit Motor Baru

1. **Request**:

   ```http
   POST /unit-motor
   Authorization: Bearer {access_token}
   Content-Type: application/json

   {
     "jenisId": "jenis-id-1",
     "platNomor": "AB 5678 XY",
     "hargaSewa": 100000,
     "status": "TERSEDIA"
   }
   ```

2. **Response Success**:
   ```json
   {
     "id": "unit-id-2",
     "jenisId": "jenis-id-1",
     "platNomor": "AB 5678 XY",
     "hargaSewa": 100000,
     "status": "TERSEDIA",
     "createdAt": "2025-03-25T12:00:00Z",
     "updatedAt": "2025-03-25T12:00:00Z"
   }
   ```

## 4. Transaksi Sewa

### Membuat Transaksi Baru

1. **Request**:

   ```http
   POST /transaksi
   Authorization: Bearer {access_token}
   Content-Type: application/json

   {
     "unitId": "unit-id-1",
     "namaPenyewa": "John Doe",
     "noWhatsapp": "6281234567890",
     "tanggalMulai": "2025-03-26",
     "tanggalSelesai": "2025-03-28",
     "totalBiaya": 300000
   }
   ```

2. **Response Success**:
   ```json
   {
     "id": "tx-id-1",
     "unitId": "unit-id-1",
     "namaPenyewa": "John Doe",
     "noWhatsapp": "6281234567890",
     "tanggalMulai": "2025-03-26T00:00:00Z",
     "tanggalSelesai": "2025-03-28T00:00:00Z",
     "status": "AKTIF",
     "totalBiaya": 300000,
     "createdAt": "2025-03-25T12:00:00Z",
     "updatedAt": "2025-03-25T12:00:00Z",
     "unitMotor": {
       "id": "unit-id-1",
       "platNomor": "AB 1234 XY",
       "status": "DISEWA",
       "jenisId": "jenis-id-1"
     }
   }
   ```

### Menyelesaikan Transaksi

1. **Request**:

   ```http
   POST /transaksi/tx-id-1/selesai
   Authorization: Bearer {access_token}
   ```

2. **Response Success**:
   ```json
   {
     "id": "tx-id-1",
     "unitId": "unit-id-1",
     "namaPenyewa": "John Doe",
     "noWhatsapp": "6281234567890",
     "tanggalMulai": "2025-03-26T00:00:00Z",
     "tanggalSelesai": "2025-03-28T00:00:00Z",
     "status": "SELESAI",
     "totalBiaya": 300000,
     "createdAt": "2025-03-25T12:00:00Z",
     "updatedAt": "2025-03-28T12:00:00Z",
     "unitMotor": {
       "id": "unit-id-1",
       "platNomor": "AB 1234 XY",
       "status": "TERSEDIA",
       "jenisId": "jenis-id-1"
     }
   }
   ```

## 5. Notifikasi WhatsApp

### Mengirim Notifikasi

1. **Request**:

   ```http
   POST /whatsapp/send
   Authorization: Bearer {access_token}
   Content-Type: application/json

   {
     "to": "6281234567890",
     "message": "Terima kasih telah menyewa motor dari kami. Detail sewa: Honda Vario, 26-28 Maret 2025, Total: Rp300.000"
   }
   ```

2. **Response Success**:
   ```json
   {
     "status": "success",
     "messageId": "whatsapp-message-id"
   }
   ```

## 6. Pengelolaan Blog

### Membuat Artikel Blog

1. **Request**:

   ```http
   POST /blog
   Authorization: Bearer {access_token}
   Content-Type: application/json

   {
     "judul": "Tips Perawatan Motor",
     "slug": "tips-perawatan-motor",
     "konten": "Berikut adalah tips merawat motor agar tetap prima...",
     "kategori": "Perawatan",
     "status": "DRAFT",
     "tags": ["perawatan", "tips"]
   }
   ```

2. **Response Success**:
   ```json
   {
     "id": "blog-id-1",
     "judul": "Tips Perawatan Motor",
     "slug": "tips-perawatan-motor",
     "konten": "Berikut adalah tips merawat motor agar tetap prima...",
     "kategori": "Perawatan",
     "status": "DRAFT",
     "thumbnail": null,
     "createdAt": "2025-03-25T12:00:00Z",
     "updatedAt": "2025-03-25T12:00:00Z",
     "tags": [
       {
         "nama": "perawatan"
       },
       {
         "nama": "tips"
       }
     ]
   }
   ```

## 7. Caching dengan Redis

### Cache Monitoring

1. **Request**:

   ```http
   GET /debug/redis/keys
   Authorization: Bearer {access_token}
   ```

2. **Response**:
   ```json
   {
     "status": "success",
     "keys": ["unit-motor:tersedia", "transaksi:aktif"]
   }
   ```

## Kode Status HTTP

- `200 OK` - Request berhasil diproses
- `201 Created` - Resource baru berhasil dibuat
- `400 Bad Request` - Format request tidak valid
- `401 Unauthorized` - Autentikasi diperlukan atau gagal
- `403 Forbidden` - Tidak memiliki izin akses
- `404 Not Found` - Resource tidak ditemukan
- `500 Internal Server Error` - Kesalahan server

## Format Error

Semua response error menggunakan format yang konsisten:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "namaPenyewa",
      "message": "namaPenyewa is required"
    }
  ]
}
```
