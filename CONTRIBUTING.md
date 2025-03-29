# Panduan Kontribusi

Terima kasih atas minat Anda untuk berkontribusi pada proyek ini! Kami sangat menghargai bantuan dari komunitas dan ingin menjadikan proses kontribusi se-efisien dan semudah mungkin. Dokumen ini menjelaskan standar dan proses berkontribusi.

## Struktur Proyek

Proyek ini mengikuti struktur folder standar untuk memudahkan pengembangan. Untuk lebih detail, silakan lihat bagian "Struktur Proyek" di [README.md](README.md).

## Panduan Penulisan Kode

### Standar Penamaan

- File: `kebab-case.ts` (contoh: `auth-service.ts`)
- Kelas: `PascalCase` (contoh: `UserService`)
- Fungsi/Metode: `camelCase` (contoh: `getUserById()`)
- Konstanta: `SCREAMING_SNAKE_CASE` (contoh: `MAX_LOGIN_ATTEMPTS`)
- Variabel: `camelCase` (contoh: `userId`)
- Interface: `PascalCase` dengan prefix `I` (contoh: `IUserData`)
- Enum: `PascalCase` (contoh: `UserRole`)
- Enum Member: `SCREAMING_SNAKE_CASE` (contoh: `ADMIN`)

### Struktur Modul

Setiap modul harus memiliki struktur berikut:

```
modules/[module-name]/
├── dto/                       # Data Transfer Objects
├── entities/                  # Entity/Model classes (jika diperlukan)
├── interfaces/                # Interface definitions
├── guards/                    # Authentication/Authorization guards
├── [module].controller.ts     # Controller untuk modul
├── [module].service.ts        # Service layer untuk modul
├── [module].module.ts         # Definisi NestJS module
└── __tests__/                 # Unit tests untuk modul
```

## Proses Pengembangan

### Membuat Modul Baru

Untuk membuat modul baru yang mengikuti struktur standar, gunakan script scaffold:

```bash
npm run scaffold:module -- nama-modul
```

### Memeriksa Konsistensi Struktur

Untuk memeriksa apakah modul-modul Anda sudah mengikuti struktur standar:

```bash
npm run check:structure
```

### Linting dan Formatting

Proyek ini menggunakan ESLint dan Prettier untuk memastikan kode tetap konsisten dan berkualitas tinggi.

- Untuk menjalankan linter:

  ```bash
  npm run lint
  ```

- Untuk memperbaiki masalah format secara otomatis:
  ```bash
  npm run format
  ```

## Langkah-langkah Kontribusi

1. **Fork dan Clone**: Fork repositori ini dan clone ke mesin lokal Anda
2. **Buat Branch**: Buat branch baru untuk fitur atau perbaikan Anda
3. **Uji**: Jalankan `npm test` untuk memastikan semuanya berfungsi
4. **Commit**: Commit perubahan Anda dengan pesan yang jelas dan deskriptif
5. **Push**: Push branch Anda ke repositori fork Anda
6. **Pull Request**: Buat Pull Request ke repositori asli

## Pertanyaan?

Jika Anda memiliki pertanyaan atau memerlukan bantuan, jangan ragu untuk membuka issue baru di repositori ini.

Terima kasih telah berkontribusi!
