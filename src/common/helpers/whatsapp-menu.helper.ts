import { formatCurrency, getStatusLabel } from './whatsapp-formatter.helper';

/**
 * Template menu utama untuk pengguna
 * @param nama Nama pengguna yang akan disapa (opsional)
 * @returns Text menu utama
 */
export function getMainMenuTemplate(nama?: string): string {
  const greeting = nama ? `Halo ${nama}!` : 'Halo!';

  return (
    `${greeting}\n\n` +
    `ROSANTIBIKE MOTORRENT\n\n` +
    `MENU UTAMA (Ketik MENU):\n` +
    `1 - Cek Daftar Motor\n` +
    `2 - Cek Harga Sewa\n` +
    `3 - Info Pemesanan\n` +
    `4 - Status Transaksi\n` +
    `5 - Bantuan\n\n` +
    `MENU BANTUAN (Ketik H1-H4):\n` +
    `H1 - Info Syarat Sewa\n` +
    `H2 - Cara Pembayaran\n` +
    `H3 - Kontak Admin\n` +
    `H4 - FAQ\n\n` +
    `MENU TRANSAKSI AKTIF (untuk penyewa saat ini):\n` +
    `A1 - Lunasi DP\n` +
    `A2 - Cek Info Sewa Saya\n` +
    `A3 - Perpanjang Sewa\n` +
    `A4 - Bantuan\n\n` +
    `MENU SETELAH TRANSAKSI SELESAI:\n` +
    `B1 - Cek Info Sewa terakhir\n` +
    `B2 - Bantuan lebih lanjut\n\n` +
    `MENU LAINNYA:\n` +
    `• BOOKING-[kode] untuk memeriksa status booking\n` +
    `• MENU untuk kembali ke menu utama kapan saja\n\n` +
    `Terima kasih telah menggunakan layanan ROSANTIBIKE MOTORRENT.`
  );
}

/**
 * Template menu untuk transaksi aktif
 * @param transaction Data transaksi
 * @returns Text menu transaksi aktif
 */
export function getActiveTransactionMenuTemplate(transaction: any): string {
  return (
    `MENU TRANSAKSI AKTIF\n\n` +
    `Halo ${transaction.namaPenyewa},\n\n` +
    `Silahkan pilih menu yang tersedia:\n\n` +
    `A1 - Lunasi DP\n` +
    `A2 - Cek Info Sewa Saya\n` +
    `A3 - Perpanjang Sewa\n` +
    `A4 - Bantuan\n\n` +
    `Balas dengan kode menu yang diinginkan.`
  );
}

/**
 * Template informasi transaksi aktif
 * @param transaction Data transaksi
 * @returns Text informasi transaksi
 */
export function getActiveTransactionInfoTemplate(transaction: any): string {
  const startDate = new Date(transaction.tanggalMulai).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const endDate = new Date(transaction.tanggalSelesai).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Hitung berapa hari sewa
  const startDateObj = new Date(transaction.tanggalMulai);
  const endDateObj = new Date(transaction.tanggalSelesai);
  const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const additionalItems: string[] = [];
  if (transaction.helm > 0) {
    additionalItems.push(`Helm: ${transaction.helm} buah`);
  }
  if (transaction.jasHujan > 0) {
    additionalItems.push(`Jas Hujan: ${transaction.jasHujan} buah`);
  }

  return (
    `INFORMASI SEWA MOTOR ANDA\n\n` +
    `Nama: ${transaction.namaPenyewa}\n` +
    `Motor: ${transaction.unitMotor.jenis.merk} ${transaction.unitMotor.jenis.model}\n` +
    `Plat Nomor: ${transaction.unitMotor.platNomor}\n` +
    `Mulai: ${startDate} ${transaction.jamMulai}\n` +
    `Selesai: ${endDate} ${transaction.jamSelesai}\n` +
    `Durasi: ${diffDays} hari\n` +
    (additionalItems.length > 0 ? `${additionalItems.join('\n')}\n` : '') +
    `Total Biaya: Rp ${formatCurrency(transaction.totalBiaya)}\n` +
    `Status: ${getStatusLabel(transaction.status)}\n\n` +
    `Ketik MENU untuk melihat menu layanan.`
  );
}

/**
 * Template instruksi pembayaran DP
 * @param transaction Data transaksi
 * @param paymentInfo Informasi pembayaran dari database
 * @returns Text instruksi pembayaran DP
 */
export function getPaymentInstructionsTemplate(
  transaction: any,
  paymentInfo: {
    bank?: string;
    accountNumber?: string;
    accountName?: string;
    dpPercentage?: number;
  } = {},
): string {
  const {
    bank = 'BCA',
    accountNumber = '1234567890',
    accountName = 'ROSANTIBIKE Motorent',
    dpPercentage = 0.3,
  } = paymentInfo;

  return (
    `INSTRUKSI PEMBAYARAN DP\n\n` +
    `Untuk melunasi DP motor ${transaction.unitMotor.jenis.merk} ${transaction.unitMotor.jenis.model} (${transaction.unitMotor.platNomor}), silahkan transfer ke:\n\n` +
    `Bank: ${bank}\n` +
    `No. Rekening: ${accountNumber}\n` +
    `Atas Nama: ${accountName}\n` +
    `Jumlah DP: Rp ${formatCurrency(transaction.totalBiaya * dpPercentage)}\n\n` +
    `Setelah transfer, mohon kirimkan bukti pembayaran ke nomor ini.\n\n` +
    `Ketik MENU untuk kembali ke menu layanan.`
  );
}

/**
 * Template instruksi perpanjangan sewa
 * @param transaction Data transaksi
 * @param adminNumber Nomor admin
 * @param websiteUrl URL website dari database
 * @returns Text instruksi perpanjangan
 */
export function getExtensionInstructionsTemplate(
  transaction: any,
  adminNumber: string,
  websiteUrl = 'https://rosantibikemotorent.com',
): string {
  return (
    `PERPANJANGAN SEWA\n\n` +
    `Untuk perpanjang sewa motor ${transaction.unitMotor.jenis.merk} ${transaction.unitMotor.jenis.model} (${transaction.unitMotor.platNomor}), silahkan kunjungi link berikut:\n\n` +
    `${websiteUrl}/perpanjang/${transaction.id}\n\n` +
    `Atau hubungi admin di nomor berikut untuk bantuan:\n` +
    `Admin: ${adminNumber}\n\n` +
    `Ketik MENU untuk kembali ke menu layanan.`
  );
}

/**
 * Template daftar motor
 * @param jenisMotor Array jenis motor
 * @returns Text daftar motor
 */
export function getMotorListTemplate(jenisMotor: any[]): string {
  let motorListText = 'DAFTAR MOTOR TERSEDIA\n\n';

  if (jenisMotor.length === 0) {
    motorListText +=
      'Saat ini semua motor sedang disewa. Silakan hubungi kami untuk informasi lebih lanjut.\n\n';
  } else {
    motorListText += 'Berikut motor yang tersedia:\n\n';

    jenisMotor.forEach((jenis, index) => {
      const jumlahTersedia = jenis.unitMotor?.length || 0;
      if (jumlahTersedia > 0) {
        // Tampilkan juga CC motor untuk informasi lengkap
        motorListText += `${index + 1}. ${jenis.merk} ${jenis.model} (${jenis.cc}cc) - ${jumlahTersedia} Unit\n`;
      }
    });

    motorListText += '\nUntuk melihat harga sewa, balas dengan angka 2';
  }

  return motorListText;
}

/**
 * Template harga sewa motor
 * @param jenisMotor Array jenis motor
 * @returns Text harga sewa
 */
export function getRentalPricesTemplate(jenisMotor: any[]): string {
  let priceText = 'HARGA SEWA MOTOR\n\n';
  priceText += 'Berikut harga sewa motor per hari:\n\n';

  jenisMotor.forEach((jenis, index) => {
    // Gunakan hargaSewa dari unitMotor pertama jika ada
    const hargaSewa =
      jenis.unitMotor && jenis.unitMotor.length > 0 ? jenis.unitMotor[0].hargaSewa : 0;
    priceText += `${index + 1}. ${jenis.merk} ${jenis.model} (${jenis.cc}cc) - Rp ${formatCurrency(hargaSewa)}/hari\n`;
  });

  priceText += '\nUntuk info pemesanan, balas dengan angka 3';

  return priceText;
}

/**
 * Template informasi pemesanan
 * @param adminNumber Nomor admin
 * @param websiteUrl URL website dari database
 * @returns Text informasi pemesanan
 */
export function getBookingInfoTemplate(
  adminNumber: string,
  websiteUrl = 'https://rosantibikemotorent.com',
): string {
  return (
    'INFO PEMESANAN\n\n' +
    'Untuk melakukan pemesanan motor, silakan isi data berikut:\n\n' +
    'Nama Lengkap\n' +
    'No. KTP/SIM\n' +
    'Alamat\n' +
    'Jenis Motor yang disewa\n' +
    'Tanggal Mulai Sewa\n' +
    'Lama Sewa (hari)\n\n' +
    `Kunjungi website kami di ${websiteUrl}\n` +
    'Atau hubungi admin di nomor berikut untuk pemesanan:\n' +
    `Admin: ${adminNumber}`
  );
}

/**
 * Template informasi status transaksi
 * @returns Text informasi status transaksi
 */
export function getTransactionStatusInfoTemplate(): string {
  return (
    'CEK STATUS TRANSAKSI\n\n' +
    'Untuk mengecek status transaksi, silakan kirimkan kode booking Anda.\n\n' +
    'Format: BOOKING-[kode]\n' +
    'Contoh: BOOKING-A12345'
  );
}

/**
 * Template menu bantuan
 * @returns Text menu bantuan
 */
export function getHelpMenuTemplate(): string {
  return (
    'MENU BANTUAN\n\n' +
    'Berikut layanan bantuan yang tersedia:\n\n' +
    'H1 - Info Syarat Sewa\n' +
    'H2 - Cara Pembayaran\n' +
    'H3 - Kontak Admin\n' +
    'H4 - FAQ\n\n' +
    'Untuk kembali ke menu utama, ketik MENU'
  );
}

/**
 * Template pesan sambutan
 * @returns Text pesan sambutan
 */
export function getWelcomeMessageTemplate(): string {
  return (
    'Selamat datang di ROSANTIBIKE MOTORRENT!\n\n' +
    'Kami menyediakan layanan sewa motor berkualitas untuk kebutuhan transportasi Anda.\n\n' +
    'Silakan ketik MENU untuk melihat pilihan menu yang tersedia.'
  );
}

/**
 * Template syarat sewa
 * @returns Text syarat sewa
 */
export function getRentalRequirementsTemplate(): string {
  return (
    'SYARAT SEWA MOTOR\n\n' +
    'Untuk menyewa motor, Anda memerlukan:\n\n' +
    '1. KTP asli (wajib)\n' +
    '2. SIM C yang masih berlaku\n' +
    '3. Uang jaminan atau barang berharga\n' +
    '4. DP minimal 30% dari total sewa\n\n' +
    'KETENTUAN:\n' +
    '• Wajib menggunakan helm yang disediakan\n' +
    '• Batas penggunaan BBM harian (akan dijelaskan saat serah terima)\n' +
    '• Denda keterlambatan pengembalian\n\n' +
    'Ketik MENU untuk kembali ke menu utama'
  );
}

/**
 * Template info pembayaran
 * @param paymentInfo Info pembayaran dari database
 * @returns Text info pembayaran
 */
export function getPaymentInfoTemplate(
  paymentInfo: {
    bank?: string;
    accountNumber?: string;
    accountName?: string;
    dpPercentage?: number;
  } = {},
): string {
  const {
    bank = 'BCA',
    accountNumber = '1234567890',
    accountName = 'ROSANTIBIKE Motorent',
    dpPercentage = 30,
  } = paymentInfo;

  return (
    'CARA PEMBAYARAN\n\n' +
    'DP Pemesanan\n' +
    `• Minimal ${dpPercentage}% dari total biaya sewa\n` +
    '• Transfer ke rekening:\n' +
    `  Bank: ${bank}\n` +
    `  No. Rekening: ${accountNumber}\n` +
    `  Atas Nama: ${accountName}\n\n` +
    'Pelunasan\n' +
    '• Pelunasan dilakukan saat pengambilan motor\n' +
    '• Pembayaran dapat dilakukan dengan tunai atau transfer\n\n' +
    'KETENTUAN:\n' +
    '• Pembatalan booking: DP tidak dapat dikembalikan\n' +
    '• Perubahan jadwal: minimal 1x24 jam sebelumnya\n\n' +
    'Ketik MENU untuk kembali ke menu utama'
  );
}

/**
 * Template kontak admin
 * @param adminInfo Info admin dari database
 * @returns Text kontak admin
 */
export function getAdminContactTemplate(
  adminInfo: {
    name?: string;
    phone?: string;
    address?: string;
    operationalHours?: string;
    socialMedia?: {
      instagram?: string;
      facebook?: string;
    };
  } = {},
): string {
  const {
    name = 'ROSANTIBIKE Motorent',
    phone = '+628123456789',
    address = 'Jl. Raya No.123, Kota',
    operationalHours = '08:00 - 20:00 WIB',
    socialMedia = {
      instagram: '@rosantibike',
      facebook: 'ROSANTIBIKE Motorent',
    },
  } = adminInfo;

  return (
    'KONTAK ADMIN\n\n' +
    `${name}\n\n` +
    `WhatsApp: ${phone}\n` +
    `Alamat: ${address}\n` +
    `Jam Operasional: ${operationalHours}\n\n` +
    'Social Media:\n' +
    `Instagram: ${socialMedia.instagram}\n` +
    `Facebook: ${socialMedia.facebook}\n\n` +
    'Ketik MENU untuk kembali ke menu utama'
  );
}

/**
 * Template FAQ
 * @returns Text FAQ
 */
export function getFAQTemplate(): string {
  return (
    'FAQ (Pertanyaan Umum)\n\n' +
    '1. Berapa DP minimal untuk sewa motor?\n' +
    'DP minimal adalah 30% dari total biaya sewa.\n\n' +
    '2. Apakah ada biaya tambahan?\n' +
    'Biaya tambahan untuk helm dan jas hujan (opsional).\n\n' +
    '3. Bagaimana jika terlambat mengembalikan?\n' +
    'Dikenakan denda per jam keterlambatan.\n\n' +
    '4. Apakah boleh dibawa keluar kota?\n' +
    'Ya, dengan pemberitahuan sebelumnya.\n\n' +
    '5. Bagaimana jika terjadi kerusakan?\n' +
    'Kerusakan akibat penggunaan normal ditanggung kami. Kerusakan akibat kecelakaan/kelalaian ditanggung penyewa.\n\n' +
    'Ketik MENU untuk kembali ke menu utama'
  );
}

/**
 * Template notifikasi pemesanan
 * @param transaction Data transaksi
 * @returns Text notifikasi pemesanan
 */
export function getBookingNotificationTemplate(transaction: any): string {
  const tanggalMulai = new Date(transaction.tanggalMulai);
  const tanggalSelesai = new Date(transaction.tanggalSelesai);
  const jenis = transaction.unitMotor.jenis;
  const unitMotor = transaction.unitMotor;

  // Hitung durasi sewa dalam hari
  const diffTime = Math.abs(tanggalSelesai.getTime() - tanggalMulai.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Informasi tambahan seperti helm dan jas hujan
  const additionalItems: string[] = [];
  if (transaction.helm > 0) {
    additionalItems.push(`Helm: ${transaction.helm} buah`);
  }
  if (transaction.jasHujan > 0) {
    additionalItems.push(`Jas Hujan: ${transaction.jasHujan} buah`);
  }

  const jamMulai = transaction.jamMulai || '08:00';
  const jamSelesai = transaction.jamSelesai || '08:00';

  return `Halo ${transaction.namaPenyewa}!

PEMESANAN BERHASIL

Terima kasih telah melakukan pemesanan di Rosanti Bike Motorent.

DETAIL PEMESANAN:
Motor: ${jenis.merk} ${jenis.model}
Plat Nomor: ${unitMotor.platNomor}
Mulai: ${tanggalMulai.toLocaleDateString('id-ID')} ${jamMulai}
Selesai: ${tanggalSelesai.toLocaleDateString('id-ID')} ${jamSelesai}
Durasi: ${diffDays} hari
${additionalItems.length > 0 ? additionalItems.join('\n') + '\n' : ''}Total Biaya: Rp ${formatCurrency(transaction.totalBiaya)}

Silakan ambil motor pada tanggal yang sudah ditentukan. Jangan lupa bawa KTP dan SIM yang masih berlaku.

MENU LAYANAN WHATSAPP
Ketik salah satu opsi berikut:
A1 - Lunasi DP
A2 - Cek Info Sewa
A3 - Perpanjang Sewa
A4 - Bantuan

Terima kasih!`;
}

/**
 * Template notifikasi pengingat pengembalian
 * @param transaction Data transaksi
 * @returns Text pengingat pengembalian
 */
export function getReminderNotificationTemplate(transaction: any): string {
  const unitMotor = transaction.unitMotor;
  const jenis = unitMotor.jenis;
  const tanggalSelesai = new Date(transaction.tanggalSelesai);

  // Format jam dengan padding nol di depan jika perlu
  const jam =
    transaction.jamSelesai ||
    `${tanggalSelesai.getHours()}:${String(tanggalSelesai.getMinutes()).padStart(2, '0')}`;

  return `Halo ${transaction.namaPenyewa}!

PENGINGAT PENGEMBALIAN

Pengingat bahwa masa sewa motor:
${jenis.merk} ${jenis.model} (${unitMotor.platNomor})

Akan berakhir hari ini pada pukul ${jam}.

Harap kembalikan tepat waktu untuk menghindari biaya keterlambatan.

MENU LAYANAN WHATSAPP
Ketik salah satu opsi berikut:
A1 - Lunasi DP
A2 - Cek Info Sewa
A3 - Perpanjang Sewa
A4 - Bantuan

Terima kasih!`;
}

/**
 * Template notifikasi overdue (keterlambatan)
 * @param transaction Data transaksi
 * @returns Text notifikasi overdue
 */
export function getOverdueNotificationTemplate(transaction: any): string {
  const unitMotor = transaction.unitMotor;
  const jenis = unitMotor.jenis;
  const tanggalSelesai = new Date(transaction.tanggalSelesai);

  // Format tanggal dan jam yang lebih user-friendly
  const tanggalFormat = tanggalSelesai.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Hitung keterlambatan dalam jam
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - tanggalSelesai.getTime());
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

  const jamSelesai =
    transaction.jamSelesai ||
    `${tanggalSelesai.getHours()}:${String(tanggalSelesai.getMinutes()).padStart(2, '0')}`;

  return `PEMBERITAHUAN PENTING

Halo ${transaction.namaPenyewa},

Motor ${jenis.merk} ${jenis.model} (${unitMotor.platNomor}) yang Anda sewa telah melewati batas waktu pengembalian:

Waktu Seharusnya: ${tanggalFormat} ${jamSelesai}
Keterlambatan: ${diffHours} jam

Status sewa Anda sekarang adalah TERLAMBAT (OVERDUE).

Mohon segera kembalikan motor tersebut untuk menghindari biaya keterlambatan yang lebih tinggi. Biaya keterlambatan akan dihitung per jam.

MENU LAYANAN WHATSAPP
Ketik salah satu opsi berikut:
A2 - Cek Info Sewa dan denda
A3 - Perpanjang Sewa
A4 - Hubungi admin

Terima kasih atas pengertian dan kerjasamanya.`;
}

/**
 * Template notifikasi overdue untuk admin
 * @param transaction Data transaksi
 * @returns Text notifikasi overdue untuk admin
 */
export function getAdminOverdueNotificationTemplate(transaction: any): string {
  const unitMotor = transaction.unitMotor;
  const jenis = unitMotor.jenis;
  const tanggalSelesai = new Date(transaction.tanggalSelesai);

  // Hitung keterlambatan dalam jam
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - tanggalSelesai.getTime());
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

  const jamSelesai =
    transaction.jamSelesai ||
    `${tanggalSelesai.getHours()}:${String(tanggalSelesai.getMinutes()).padStart(2, '0')}`;

  return `NOTIFIKASI OVERDUE

Penyewa: ${transaction.namaPenyewa}
WhatsApp: ${transaction.noWhatsapp}
Motor: ${jenis.merk} ${jenis.model} (${unitMotor.platNomor})
Batas Waktu: ${tanggalSelesai.toLocaleString('id-ID')} ${jamSelesai}
Keterlambatan: ${diffHours} jam
Status: OVERDUE

Motor belum dikembalikan. Status otomatis diubah menjadi OVERDUE.

Mohon segera hubungi penyewa untuk tindak lanjut.`;
}

/**
 * Template notifikasi penyelesaian transaksi
 * @param transaction Data transaksi
 * @returns Text notifikasi penyelesaian
 */
export function getCompletionNotificationTemplate(transaction: any): string {
  const unitMotor = transaction.unitMotor;
  const jenis = unitMotor.jenis;

  // Tanggal mulai dan selesai untuk informasi durasi sewa
  const tanggalMulai = new Date(transaction.tanggalMulai);
  const tanggalSelesai = new Date(transaction.tanggalSelesai);

  // Hitung durasi sewa dalam hari
  const diffTime = Math.abs(tanggalSelesai.getTime() - tanggalMulai.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Periksa biaya denda jika ada
  const biayaDenda = transaction.biayaDenda || 0;

  return `Halo ${transaction.namaPenyewa}!

TRANSAKSI SELESAI

Terima kasih telah mengembalikan motor:
${jenis.merk} ${jenis.model} (${unitMotor.platNomor})

RINGKASAN SEWA:
Durasi Sewa: ${diffDays} hari
Total Biaya: Rp ${formatCurrency(transaction.totalBiaya)}
${biayaDenda > 0 ? `Biaya Denda: Rp ${formatCurrency(biayaDenda)}\n` : ''}
Status: SELESAI

Kami harap Anda puas dengan layanan kami. Jangan ragu untuk menyewa kembali di lain waktu.

MENU LAYANAN WHATSAPP
Ketik salah satu opsi berikut:
B1 - Cek Info Sewa terakhir
B2 - Bantuan lebih lanjut
MENU - Lihat semua layanan

Terima kasih!`;
}

/**
 * Template status pesan berdasarkan status transaksi
 * @param status Status transaksi
 * @returns Text status pesan
 */
export function getStatusMessageTemplate(status: string): string {
  switch (status.toLowerCase()) {
    case 'pending': {
      return 'PENDING';
    }
    case 'confirmed':
    case 'aktif': {
      return 'AKTIF';
    }
    case 'completed':
    case 'selesai': {
      return 'SELESAI';
    }
    case 'cancelled':
    case 'dibatalkan': {
      return 'DIBATALKAN';
    }
    case 'overdue': {
      return 'TERLAMBAT';
    }
    default: {
      return `${status.toUpperCase()}`;
    }
  }
}

/**
 * Template informasi rental
 * @param rental Data rental
 * @returns Text informasi rental
 */
export function getRentalInfoTemplate(rental: any): string {
  if (!rental) {
    return `INFO PENYEWAAN

Maaf, kami tidak menemukan data penyewaan aktif untuk nomor WhatsApp ini.

Ketik angka 3 untuk melakukan penyewaan baru.
Ketik MENU untuk kembali ke menu utama.`;
  }

  const tanggalMulai = new Date(rental.tanggalMulai);
  const tanggalSelesai = new Date(rental.tanggalSelesai);

  const diffTime = Math.abs(tanggalSelesai.getTime() - tanggalMulai.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Tambahan item
  const additionalItems: string[] = [];
  if (rental.helm > 0) {
    additionalItems.push(`Helm: ${rental.helm} buah`);
  }
  if (rental.jasHujan > 0) {
    additionalItems.push(`Jas Hujan: ${rental.jasHujan} buah`);
  }

  const biayaDenda = rental.biayaDenda
    ? `\nBiaya Denda: Rp ${formatCurrency(rental.biayaDenda)}`
    : '';

  return `INFO PENYEWAAN

Status: ${getStatusMessageTemplate(rental.status)}

Detail Penyewa:
   Nama: ${rental.namaPenyewa}
   No. WhatsApp: ${rental.noWhatsapp}

Motor:
   Merk: ${rental.unitMotor.jenis.merk} ${rental.unitMotor.jenis.model}
   Plat: ${rental.unitMotor.platNomor}

Durasi:
   Mulai: ${tanggalMulai.toLocaleDateString('id-ID')} ${rental.jamMulai || ''}
   Selesai: ${tanggalSelesai.toLocaleDateString('id-ID')} ${rental.jamSelesai || ''}
   Lama Sewa: ${diffDays} hari

${additionalItems.length > 0 ? additionalItems.join('\n') + '\n' : ''}Biaya:
   Total: Rp ${formatCurrency(rental.totalBiaya)}${biayaDenda}
   
Ketik:
A3 - untuk perpanjang sewa
A4 - untuk bantuan lebih lanjut
MENU - untuk kembali ke menu utama`;
}

/**
 * Template informasi tentang kami
 * @returns Text informasi tentang kami
 */
export function getAboutUsTemplate(): string {
  return `TENTANG ROSANTIBIKE MOTORENT

Rosanti Bike Motorent adalah jasa penyewaan motor terpercaya sejak 2010. Berlokasi strategis di Yogyakarta, kami menyediakan berbagai jenis motor dengan kondisi prima untuk kebutuhan transportasi Anda.

Keunggulan Kami:
• Motor berkualitas dan terawat
• Harga bersaing dan transparan
• Proses booking yang mudah
• Pelayanan 24/7
• Pengalaman lebih dari 10 tahun

Alamat:
Jl. Kaliurang Km 9, Sleman, Yogyakarta

Kontak:
WhatsApp: 0812-3456-7890
Email: info@rosantibike.com

Jam Operasional:
Senin-Minggu: 08.00 - 21.00 WIB

Ketik MENU untuk kembali ke menu utama.`;
}
