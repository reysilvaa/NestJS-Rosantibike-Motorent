# API Documentation

This document provides a comprehensive guide to all API endpoints available in the Rental Motor application.

## Table of Contents

- [Authentication API](#authentication-api)
- [Admin API](#admin-api)
- [Jenis Motor API](#jenis-motor-api)
- [Unit Motor API](#unit-motor-api)
- [Transaksi API](#transaksi-api)
- [Blog API](#blog-api)
- [WhatsApp API](#whatsapp-api)
- [Redis Debug API](#redis-debug-api)

## Authentication API

Base URL: `/auth`

| Method | Endpoint | Description | Authentication |
| ------ | -------- | ----------- | -------------- |
| POST   | `/login` | Login admin | No             |

### POST `/auth/login`

Login to get authentication token.

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin123",
    "nama": "Admin Rental"
  }
}
```

**Response (401):**

```json
{
  "statusCode": 401,
  "message": "Username atau password salah",
  "error": "Unauthorized"
}
```

## Admin API

Base URL: `/admin`

| Method | Endpoint | Description            | Authentication |
| ------ | -------- | ---------------------- | -------------- |
| GET    | `/debug` | Get all admin accounts | No             |
| POST   | `/`      | Create new admin       | Yes            |
| PUT    | `/:id`   | Update admin           | Yes            |
| DELETE | `/:id`   | Delete admin           | Yes            |

### GET `/admin/debug`

Get list of all admin accounts.

**Response (200):**

```json
{
  "data": [
    {
      "id": "string",
      "username": "string",
      "nama": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

### POST `/admin`

Create a new admin account.

**Headers:**

```
Authorization: Bearer {token}
```

**Request Body:**

```json
{
  "username": "string",
  "password": "string",
  "nama": "string"
}
```

**Response (201):**

```json
{
  "message": "Admin berhasil dibuat",
  "data": {
    "id": "string",
    "username": "string",
    "nama": "string",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### PUT `/admin/:id`

Update an admin account.

**Headers:**

```
Authorization: Bearer {token}
```

**Parameters:**

- `id`: Admin ID

**Request Body:**

```json
{
  "password": "string", // optional
  "nama": "string" // optional
}
```

**Response (200):**

```json
{
  "message": "Admin berhasil diupdate",
  "data": {
    "id": "string",
    "username": "string",
    "nama": "string",
    "updatedAt": "string"
  }
}
```

### DELETE `/admin/:id`

Delete an admin account.

**Headers:**

```
Authorization: Bearer {token}
```

**Parameters:**

- `id`: Admin ID

**Response (200):**

```json
{
  "message": "Admin berhasil dihapus"
}
```

## Jenis Motor API

Base URL: `/jenis-motor`

| Method | Endpoint        | Description           | Authentication |
| ------ | --------------- | --------------------- | -------------- |
| GET    | `/`             | Get all motor types   | No             |
| GET    | `/:id`          | Get motor type by ID  | No             |
| POST   | `/`             | Create new motor type | No             |
| PATCH  | `/:id`          | Update motor type     | No             |
| DELETE | `/:id`          | Delete motor type     | No             |
| POST   | `/debug-upload` | Debug upload files    | No             |

### GET `/jenis-motor`

Get all motor types.

**Query Parameters:**

- `search`: Search by merk or model (optional)

**Response (200):**

```json
{
  "data": [
    {
      "id": "string",
      "merk": "string",
      "model": "string",
      "cc": 150,
      "tahun": 2022,
      "deskripsi": "string",
      "gambar": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

### GET `/jenis-motor/:id`

Get motor type by ID.

**Parameters:**

- `id`: Motor type ID

**Response (200):**

```json
{
  "data": {
    "id": "string",
    "merk": "string",
    "model": "string",
    "cc": 150,
    "tahun": 2022,
    "deskripsi": "string",
    "gambar": "string",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### POST `/jenis-motor`

Create new motor type.

**Request Body (multipart/form-data):**

- `merk`: string (required)
- `model`: string (required)
- `cc`: number (required)
- `file`, `gambar`, or `image`: File (optional) - Image file
- `deskripsi`: string (optional)
- `tahun`: number (optional)

**Response (201):**

```json
{
  "message": "Jenis motor berhasil dibuat",
  "data": {
    "id": "string",
    "merk": "string",
    "model": "string",
    "cc": 150,
    "tahun": 2022,
    "deskripsi": "string",
    "gambar": "string",
    "createdAt": "string"
  }
}
```

### PATCH `/jenis-motor/:id`

Update motor type.

**Parameters:**

- `id`: Motor type ID

**Request Body (multipart/form-data):**

- `merk`: string (optional)
- `model`: string (optional)
- `cc`: number (optional)
- `file`, `gambar`, or `image`: File (optional) - Image file
- `deskripsi`: string (optional)
- `tahun`: number (optional)

**Response (200):**

```json
{
  "message": "Jenis motor berhasil diperbarui",
  "data": {
    "id": "string",
    "merk": "string",
    "model": "string",
    "cc": 150,
    "tahun": 2022,
    "deskripsi": "string",
    "gambar": "string",
    "updatedAt": "string"
  }
}
```

### DELETE `/jenis-motor/:id`

Delete motor type.

**Parameters:**

- `id`: Motor type ID

**Response (200):**

```json
{
  "message": "Jenis motor berhasil dihapus"
}
```

## Unit Motor API

Base URL: `/unit-motor`

| Method | Endpoint        | Description              | Authentication |
| ------ | --------------- | ------------------------ | -------------- |
| GET    | `/`             | Get all motor units      | No             |
| GET    | `/availability` | Check motor availability | No             |
| GET    | `/:id`          | Get motor unit by ID     | No             |
| POST   | `/`             | Create new motor unit    | No             |
| PATCH  | `/:id`          | Update motor unit        | No             |
| DELETE | `/:id`          | Delete motor unit        | No             |

### GET `/unit-motor`

Get all motor units.

**Query Parameters:**

- Filter parameters based on FilterUnitMotorDto

**Response (200):**

```json
{
  "data": [
    {
      "id": "string",
      "noPlat": "string",
      "warna": "string",
      "harga": 100000,
      "status": "TERSEDIA",
      "jenisMotor": {
        "id": "string",
        "merk": "string",
        "model": "string"
      },
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

### GET `/unit-motor/availability`

Check motor availability for specific date range.

**Query Parameters:**

- `tanggalMulai`: Start date
- `tanggalSelesai`: End date
- `jenisMotorId`: Motor type ID (optional)

**Response (200):**

```json
{
  "data": [
    {
      "id": "string",
      "noPlat": "string",
      "warna": "string",
      "harga": 100000,
      "status": "TERSEDIA",
      "jenisMotor": {
        "id": "string",
        "merk": "string",
        "model": "string"
      }
    }
  ]
}
```

### GET `/unit-motor/:id`

Get motor unit by ID.

**Parameters:**

- `id`: Motor unit ID

**Response (200):**

```json
{
  "data": {
    "id": "string",
    "noPlat": "string",
    "warna": "string",
    "harga": 100000,
    "status": "TERSEDIA",
    "jenisMotor": {
      "id": "string",
      "merk": "string",
      "model": "string"
    },
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### POST `/unit-motor`

Create new motor unit.

**Request Body:**

```json
{
  "noPlat": "string",
  "warna": "string",
  "harga": 100000,
  "jenisMotorId": "string"
}
```

**Response (201):**

```json
{
  "message": "Unit motor berhasil dibuat",
  "data": {
    "id": "string",
    "noPlat": "string",
    "warna": "string",
    "harga": 100000,
    "status": "TERSEDIA",
    "jenisMotorId": "string",
    "createdAt": "string"
  }
}
```

### PATCH `/unit-motor/:id`

Update motor unit.

**Parameters:**

- `id`: Motor unit ID

**Request Body:**

```json
{
  "noPlat": "string",
  "warna": "string",
  "harga": 100000,
  "status": "TERSEDIA"
}
```

**Response (200):**

```json
{
  "message": "Unit motor berhasil diperbarui",
  "data": {
    "id": "string",
    "noPlat": "string",
    "warna": "string",
    "harga": 100000,
    "status": "TERSEDIA",
    "updatedAt": "string"
  }
}
```

### DELETE `/unit-motor/:id`

Delete motor unit.

**Parameters:**

- `id`: Motor unit ID

**Response (200):**

```json
{
  "message": "Unit motor berhasil dihapus"
}
```

## Transaksi API

Base URL: `/transaksi`

| Method | Endpoint       | Description             | Authentication |
| ------ | -------------- | ----------------------- | -------------- |
| GET    | `/`            | Get all transactions    | No             |
| GET    | `/history`     | Get transaction history | No             |
| GET    | `/:id`         | Get transaction by ID   | No             |
| POST   | `/`            | Create new transaction  | No             |
| PATCH  | `/:id`         | Update transaction      | No             |
| DELETE | `/:id`         | Delete transaction      | No             |
| POST   | `/:id/selesai` | Complete transaction    | No             |

### GET `/transaksi`

Get all transactions.

**Query Parameters:**

- Filter parameters based on FilterTransaksiDto

**Response (200):**

```json
{
  "data": [
    {
      "id": "string",
      "namaCustomer": "string",
      "noHP": "string",
      "alamat": "string",
      "nomorKTP": "string",
      "tanggalMulai": "string",
      "tanggalSelesai": "string",
      "status": "AKTIF",
      "totalBiaya": 300000,
      "unitMotor": {
        "id": "string",
        "noPlat": "string",
        "jenisMotor": {
          "merk": "string",
          "model": "string"
        }
      },
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

### GET `/transaksi/history`

Get transaction history (completed or overdue transactions).

**Query Parameters:**

- Filter parameters based on FilterTransaksiDto

**Response (200):**

```json
{
  "data": [
    {
      "id": "string",
      "namaCustomer": "string",
      "noHP": "string",
      "alamat": "string",
      "nomorKTP": "string",
      "tanggalMulai": "string",
      "tanggalSelesai": "string",
      "status": "SELESAI",
      "totalBiaya": 300000,
      "unitMotor": {
        "id": "string",
        "noPlat": "string",
        "jenisMotor": {
          "merk": "string",
          "model": "string"
        }
      },
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

### GET `/transaksi/:id`

Get transaction by ID.

**Parameters:**

- `id`: Transaction ID

**Response (200):**

```json
{
  "data": {
    "id": "string",
    "namaCustomer": "string",
    "noHP": "string",
    "alamat": "string",
    "nomorKTP": "string",
    "tanggalMulai": "string",
    "tanggalSelesai": "string",
    "status": "AKTIF",
    "totalBiaya": 300000,
    "unitMotor": {
      "id": "string",
      "noPlat": "string",
      "jenisMotor": {
        "merk": "string",
        "model": "string"
      }
    },
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### POST `/transaksi`

Create new transaction.

**Request Body:**

```json
{
  "namaCustomer": "string",
  "noHP": "string",
  "alamat": "string",
  "nomorKTP": "string",
  "tanggalMulai": "2023-06-01",
  "tanggalSelesai": "2023-06-03",
  "unitMotorId": "string"
}
```

**Response (201):**

```json
{
  "message": "Transaksi berhasil dibuat",
  "data": {
    "id": "string",
    "namaCustomer": "string",
    "noHP": "string",
    "alamat": "string",
    "nomorKTP": "string",
    "tanggalMulai": "2023-06-01",
    "tanggalSelesai": "2023-06-03",
    "status": "AKTIF",
    "totalBiaya": 300000,
    "unitMotorId": "string",
    "createdAt": "string"
  }
}
```

### PATCH `/transaksi/:id`

Update transaction.

**Parameters:**

- `id`: Transaction ID

**Request Body:**

```json
{
  "namaCustomer": "string", // optional
  "noHP": "string", // optional
  "alamat": "string", // optional
  "nomorKTP": "string", // optional
  "tanggalMulai": "2023-06-01", // optional
  "tanggalSelesai": "2023-06-03", // optional
  "status": "AKTIF" // optional
}
```

**Response (200):**

```json
{
  "message": "Transaksi berhasil diperbarui",
  "data": {
    "id": "string",
    "namaCustomer": "string",
    "noHP": "string",
    "alamat": "string",
    "nomorKTP": "string",
    "tanggalMulai": "2023-06-01",
    "tanggalSelesai": "2023-06-03",
    "status": "AKTIF",
    "updatedAt": "string"
  }
}
```

### DELETE `/transaksi/:id`

Delete transaction.

**Parameters:**

- `id`: Transaction ID

**Response (200):**

```json
{
  "message": "Transaksi berhasil dihapus"
}
```

### POST `/transaksi/:id/selesai`

Complete a transaction.

**Parameters:**

- `id`: Transaction ID

**Response (200):**

```json
{
  "message": "Transaksi berhasil diselesaikan",
  "data": {
    "id": "string",
    "status": "SELESAI",
    "updatedAt": "string"
  }
}
```

## Blog API

Base URL: `/blog`

| Method | Endpoint        | Description        | Authentication |
| ------ | --------------- | ------------------ | -------------- |
| GET    | `/`             | Get all blogs      | No             |
| GET    | `/:id`          | Get blog by ID     | No             |
| POST   | `/`             | Create new blog    | No             |
| PATCH  | `/:id`          | Update blog        | No             |
| DELETE | `/:id`          | Delete blog        | No             |
| POST   | `/debug-upload` | Debug upload files | No             |

### GET `/blog`

Get all blogs with pagination.

**Query Parameters:**

- `page`: Page number (optional)
- `limit`: Items per page (optional)
- `search`: Search in title or content (optional)
- `status`: Filter by status ('draft' or 'published') (optional)
- `kategori`: Filter by category (optional)

**Response (200):**

```json
{
  "data": [
    {
      "id": "string",
      "judul": "string",
      "slug": "string",
      "konten": "string",
      "featuredImage": "string",
      "status": "published",
      "kategori": "string",
      "tags": ["tag1", "tag2"],
      "meta_description": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "meta": {
    "totalItems": 10,
    "itemsPerPage": 10,
    "totalPages": 1,
    "currentPage": 1
  }
}
```

### GET `/blog/:id`

Get blog by ID.

**Parameters:**

- `id`: Blog ID

**Response (200):**

```json
{
  "data": {
    "id": "string",
    "judul": "string",
    "slug": "string",
    "konten": "string",
    "featuredImage": "string",
    "status": "published",
    "kategori": "string",
    "tags": ["tag1", "tag2"],
    "meta_description": "string",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

### POST `/blog`

Create new blog.

**Request Body (multipart/form-data):**

- `judul`: string (required)
- `konten`: string (required)
- `file`, `gambar`, or `image`: File (optional) - Image file
- `slug`: string (optional) - Will be auto-generated from title if not provided
- `status`: string (optional) - 'draft' or 'published'
- `kategori`: string (optional)
- `tags`: array of strings (optional)
- `meta_description`: string (optional)

**Response (201):**

```json
{
  "message": "Blog berhasil dibuat",
  "data": {
    "id": "string",
    "judul": "string",
    "slug": "string",
    "konten": "string",
    "featuredImage": "string",
    "status": "published",
    "kategori": "string",
    "tags": ["tag1", "tag2"],
    "meta_description": "string",
    "createdAt": "string"
  }
}
```

### PATCH `/blog/:id`

Update blog.

**Parameters:**

- `id`: Blog ID

**Request Body (multipart/form-data):**

- `judul`: string (optional)
- `konten`: string (optional)
- `file`, `gambar`, or `image`: File (optional) - Image file
- `slug`: string (optional)
- `status`: string (optional) - 'draft' or 'published'
- `kategori`: string (optional)
- `tags`: array of strings (optional)
- `meta_description`: string (optional)

**Response (200):**

```json
{
  "message": "Blog berhasil diperbarui",
  "data": {
    "id": "string",
    "judul": "string",
    "slug": "string",
    "konten": "string",
    "featuredImage": "string",
    "status": "published",
    "kategori": "string",
    "tags": ["tag1", "tag2"],
    "meta_description": "string",
    "updatedAt": "string"
  }
}
```

### DELETE `/blog/:id`

Delete blog.

**Parameters:**

- `id`: Blog ID

**Response (200):**

```json
{
  "message": "Blog berhasil dihapus"
}
```

## WhatsApp API

Base URL: `/whatsapp`

| Method | Endpoint            | Description                      | Authentication |
| ------ | ------------------- | -------------------------------- | -------------- |
| POST   | `/send`             | Send WhatsApp message            | No             |
| POST   | `/send-admin`       | Send message to admin            | No             |
| POST   | `/reset-connection` | Reset WhatsApp connection        | No             |
| GET    | `/status`           | Check WhatsApp connection status | No             |
| GET    | `/qrcode`           | Get WhatsApp QR code             | No             |

### POST `/whatsapp/send`

Send WhatsApp message.

**Request Body:**

```json
{
  "to": "628123456789",
  "message": "Hello, this is a test message"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Pesan berhasil dikirim"
}
```

### POST `/whatsapp/send-admin`

Send message to admin WhatsApp.

**Request Body:**

```json
{
  "message": "Hello admin, this is a test message"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Pesan berhasil dikirim ke admin"
}
```

### POST `/whatsapp/reset-connection`

Reset WhatsApp connection.

**Response (200):**

```json
{
  "success": true,
  "message": "Koneksi WhatsApp berhasil di-reset"
}
```

### GET `/whatsapp/status`

Check WhatsApp connection status.

**Response (200):**

```json
{
  "status": {
    "status": "connected",
    "retryCount": 0
  },
  "isReconnecting": false,
  "isConnected": true,
  "isAuthenticating": false,
  "message": ""
}
```

### GET `/whatsapp/qrcode`

Get WhatsApp QR code for authentication.

**Response (200):**

```json
{
  "qrCode": "data:image/png;base64,..."
}
```

## Redis Debug API

Base URL: `/debug/redis`

| Method | Endpoint    | Description                | Authentication |
| ------ | ----------- | -------------------------- | -------------- |
| GET    | `/ping`     | Test Redis connection      | No             |
| GET    | `/info`     | Get Redis server info      | No             |
| GET    | `/keys`     | Get Redis keys by pattern  | No             |
| GET    | `/key/:key` | Get value of a Redis key   | No             |
| POST   | `/key`      | Set a Redis key-value pair | No             |
| DELETE | `/key/:key` | Delete a Redis key         | No             |

### GET `/debug/redis/ping`

Test Redis connection.

**Response (200):**

```json
{
  "status": "success",
  "message": "PONG"
}
```

### GET `/debug/redis/info`

Get Redis server info.

**Response (200):**

```json
{
  "status": "success",
  "info": "# Server\r\nredis_version:6.0.16\r\n..."
}
```

### GET `/debug/redis/keys`

Get Redis keys by pattern.

**Query Parameters:**

- `pattern`: Key pattern to search for (default: '\*')

**Response (200):**

```json
{
  "status": "success",
  "keys": ["key1", "key2", "key3"]
}
```

### GET `/debug/redis/key/:key`

Get value of a Redis key.

**Parameters:**

- `key`: Redis key

**Response (200):**

```json
{
  "status": "success",
  "exists": true,
  "value": {
    "data": "value data",
    "ttl": 3600
  }
}
```

### POST `/debug/redis/key`

Set a Redis key-value pair.

**Request Body:**

```json
{
  "key": "testKey",
  "value": "testValue",
  "ttl": 3600
}
```

**Response (200):**

```json
{
  "status": "success",
  "message": "Key testKey set successfully"
}
```

### DELETE `/debug/redis/key/:key`

Delete a Redis key.

**Parameters:**

- `key`: Redis key to delete

**Response (200):**

```json
{
  "status": "success",
  "message": "Key testKey deleted successfully"
}
```

## File Upload Notes

For all endpoints that accept file uploads:

1. Supported image formats: jpg, jpeg, png, gif, webp
2. Maximum file size: 5MB
3. File fields can be named: `file`, `gambar`, or `image`
