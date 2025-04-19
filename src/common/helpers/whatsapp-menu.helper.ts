import { formatCurrency, getStatusLabel } from './whatsapp-formatter.helper';

/**
 * Template menu utama untuk pengguna
 * @returns Text menu utama
 */
export function getMainMenuTemplate(): string {
  return (
    '🏍️ *ROSANTIBIKE MOTORRENT* 🏍️\n\n' +
    'Silakan pilih menu berikut:\n' +
    '1️⃣ Cek Daftar Motor\n' +
    '2️⃣ Cek Harga Sewa\n' +
    '3️⃣ Info Pemesanan\n' +
    '4️⃣ Status Transaksi\n' +
    '5️⃣ Bantuan\n\n' +
    'Balas dengan nomor menu yang diinginkan.'
  );
}

/**
 * Template menu untuk transaksi aktif
 * @param transaction Data transaksi
 * @returns Text menu transaksi aktif
 */
export function getActiveTransactionMenuTemplate(transaction: any): string {
  return (
    `*MENU ROSANTI BIKE MOTORENT*\n\n` +
    `Halo ${transaction.namaPenyewa},\n` +
    `Silahkan pilih menu yang tersedia:\n\n` +
    `1️⃣ Lunasi DP\n` +
    `2️⃣ Cek Info Sewa Saya\n` +
    `3️⃣ Perpanjang Sewa\n` +
    `4️⃣ Bantuan\n\n` +
    `Balas dengan nomor menu yang diinginkan.`
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

  return (
    `*INFORMASI SEWA MOTOR ANDA*\n\n` +
    `Nama: ${transaction.namaPenyewa}\n` +
    `Motor: ${transaction.unitMotor.jenis.nama || transaction.unitMotor.jenis.model} (${transaction.unitMotor.platNomor})\n` +
    `Tanggal Mulai: ${startDate} ${transaction.jamMulai}\n` +
    `Tanggal Selesai: ${endDate} ${transaction.jamSelesai}\n` +
    `Total Biaya: Rp ${formatCurrency(transaction.totalBiaya)}\n` +
    `Status: ${getStatusLabel(transaction.status)}\n\n` +
    `Kode Booking: ${transaction.id}\n\n` +
    `Ketik *MENU* untuk melihat menu layanan.`
  );
}

/**
 * Template instruksi pembayaran DP
 * @param transaction Data transaksi
 * @returns Text instruksi pembayaran DP
 */
export function getPaymentInstructionsTemplate(transaction: any): string {
  return (
    `*INSTRUKSI PEMBAYARAN DP*\n\n` +
    `Untuk melunasi DP motor ${transaction.unitMotor.jenis.nama || transaction.unitMotor.jenis.model} ${transaction.unitMotor.platNomor}, silahkan transfer ke:\n\n` +
    `Bank: BCA\n` +
    `No. Rekening: 1234567890\n` +
    `Atas Nama: Rosanti Bike Motorent\n` +
    `Jumlah: Rp ${formatCurrency(transaction.totalBiaya * 0.3)}\n\n` +
    `Setelah transfer, mohon kirimkan bukti pembayaran ke nomor ini.\n\n` +
    `Kode Booking: ${transaction.id}\n\n` +
    `Ketik *MENU* untuk kembali ke menu layanan.`
  );
}

/**
 * Template instruksi perpanjangan sewa
 * @param transaction Data transaksi
 * @param adminNumber Nomor admin
 * @returns Text instruksi perpanjangan
 */
export function getExtensionInstructionsTemplate(transaction: any, adminNumber: string): string {
  return (
    `*PERPANJANGAN SEWA*\n\n` +
    `Untuk perpanjang sewa motor ${transaction.unitMotor.jenis.nama || transaction.unitMotor.jenis.model} ${transaction.unitMotor.platNomor}, silahkan kunjungi link berikut:\n\n` +
    `https://rosantibikemotorent.com/perpanjang/${transaction.id}\n\n` +
    `Atau hubungi admin di nomor berikut untuk bantuan:\n` +
    `Admin: ${adminNumber}\n\n` +
    `Ketik *MENU* untuk kembali ke menu layanan.`
  );
}

/**
 * Template daftar motor
 * @param jenisMotor Array jenis motor
 * @returns Text daftar motor
 */
export function getMotorListTemplate(jenisMotor: any[]): string {
  let motorListText = '🏍️ *DAFTAR MOTOR TERSEDIA* 🏍️\n\n';

  if (jenisMotor.length === 0) {
    motorListText +=
      'Saat ini semua motor sedang disewa. Silakan hubungi kami untuk informasi lebih lanjut.\n\n';
  } else {
    motorListText += 'Berikut motor yang tersedia:\n\n';

    jenisMotor.forEach((jenis, index) => {
      const jumlahTersedia = jenis.unitMotor?.length || 0;
      if (jumlahTersedia > 0) {
        motorListText += `${index + 1}. ${jenis.model} - ${jumlahTersedia} Unit\n`;
      }
    });

    motorListText += '\nUntuk melihat harga sewa, balas dengan *2*';
  }

  return motorListText;
}

/**
 * Template harga sewa motor
 * @param jenisMotor Array jenis motor
 * @returns Text harga sewa
 */
export function getRentalPricesTemplate(jenisMotor: any[]): string {
  let priceText = '💰 *HARGA SEWA* 💰\n\n';
  priceText += 'Berikut harga sewa motor per hari:\n\n';

  jenisMotor.forEach((jenis, index) => {
    priceText += `${index + 1}. ${jenis.model} - Rp ${formatCurrency(jenis.hargaSewa || 0)}/hari\n`;
  });

  priceText += '\nUntuk info pemesanan, balas dengan *3*';

  return priceText;
}

/**
 * Template informasi pemesanan
 * @param adminNumber Nomor admin
 * @returns Text informasi pemesanan
 */
export function getBookingInfoTemplate(adminNumber: string): string {
  return (
    '📝 *INFO PEMESANAN* 📝\n\n' +
    'Untuk melakukan pemesanan motor, silakan isi data berikut:\n\n' +
    '- Nama Lengkap\n' +
    '- No. KTP/SIM\n' +
    '- Alamat\n' +
    '- Jenis Motor yang disewa\n' +
    '- Tanggal Mulai Sewa\n' +
    '- Lama Sewa (hari)\n\n' +
    'Kunjungi website kami di https://rosantibikemotorent.com atau hubungi admin di nomor berikut untuk pemesanan:\n' +
    `Admin: ${adminNumber}`
  );
}

/**
 * Template informasi status transaksi
 * @returns Text informasi status transaksi
 */
export function getTransactionStatusInfoTemplate(): string {
  return (
    '🔍 *CEK STATUS TRANSAKSI* 🔍\n\n' +
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
    '*MENU BANTUAN*\n\n' +
    'Berikut layanan bantuan yang tersedia:\n\n' +
    '1️⃣ Info Syarat Sewa - Ketik *SYARAT*\n' +
    '2️⃣ Cara Pembayaran - Ketik *BAYAR*\n' +
    '3️⃣ Kontak Admin - Ketik *ADMIN*\n' +
    '4️⃣ FAQ - Ketik *FAQ*\n\n' +
    'Untuk kembali ke menu utama, ketik *MENU*'
  );
}

/**
 * Template pesan sambutan
 * @returns Text pesan sambutan
 */
export function getWelcomeMessageTemplate(): string {
  return (
    'Selamat datang di *ROSANTIBIKE MOTORRENT*! 🏍️\n\n' +
    'Silakan ketik *MENU* untuk melihat pilihan menu yang tersedia.'
  );
}
