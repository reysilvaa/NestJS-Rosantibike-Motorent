import { formatCurrency, getStatusLabel } from './whatsapp-formatter.helper';

/**
 * Template menu utama untuk pengguna
 * @returns Text menu utama
 */
export function getMainMenuTemplate(): string {
  return (
    '🏍️ *ROSANTIBIKE MOTORRENT* 🏍️\n\n' +
    '✨ *MENU UTAMA* ✨\n\n' +
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
    `✅ *MENU TRANSAKSI AKTIF* ✅\n\n` +
    `Halo *${transaction.namaPenyewa}*,\n\n` +
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

  // Hitung berapa hari sewa
  const startDateObj = new Date(transaction.tanggalMulai);
  const endDateObj = new Date(transaction.tanggalSelesai);
  const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const additionalItems: string[] = [];
  if (transaction.helm > 0) {
    additionalItems.push(`🪖 *Helm*: ${transaction.helm} buah`);
  }
  if (transaction.jasHujan > 0) {
    additionalItems.push(`🧥 *Jas Hujan*: ${transaction.jasHujan} buah`);
  }

  return (
    `📋 *INFORMASI SEWA MOTOR ANDA* 📋\n\n` +
    `👤 *Nama*: ${transaction.namaPenyewa}\n` +
    `🏍️ *Motor*: ${transaction.unitMotor.jenis.merk} ${transaction.unitMotor.jenis.model}\n` +
    `🔢 *Plat Nomor*: ${transaction.unitMotor.platNomor}\n` +
    `📆 *Mulai*: ${startDate} ${transaction.jamMulai}\n` +
    `📆 *Selesai*: ${endDate} ${transaction.jamSelesai}\n` +
    `⏱️ *Durasi*: ${diffDays} hari\n` +
    (additionalItems.length > 0 ? `${additionalItems.join('\n')}\n` : '') +
    `💰 *Total Biaya*: Rp ${formatCurrency(transaction.totalBiaya)}\n` +
    `🏷️ *Status*: ${getStatusLabel(transaction.status)}\n\n` +
    `Ketik *MENU* untuk melihat menu layanan.`
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
  } = {}
): string {
  const { 
    bank = 'BCA', 
    accountNumber = '1234567890', 
    accountName = 'Rosanti Bike Motorent', 
    dpPercentage = 0.3 
  } = paymentInfo;

  return (
    `💳 *INSTRUKSI PEMBAYARAN DP* 💳\n\n` +
    `Untuk melunasi DP motor ${transaction.unitMotor.jenis.merk} ${transaction.unitMotor.jenis.model} (${transaction.unitMotor.platNomor}), silahkan transfer ke:\n\n` +
    `🏦 *Bank*: ${bank}\n` +
    `💼 *No. Rekening*: ${accountNumber}\n` +
    `👤 *Atas Nama*: ${accountName}\n` +
    `💰 *Jumlah DP*: Rp ${formatCurrency(transaction.totalBiaya * dpPercentage)}\n\n` +
    `📲 Setelah transfer, mohon kirimkan bukti pembayaran ke nomor ini.\n\n` +
    `Ketik *MENU* untuk kembali ke menu layanan.`
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
  websiteUrl = 'https://rosantibikemotorent.com'
): string {
  return (
    `⏳ *PERPANJANGAN SEWA* ⏳\n\n` +
    `Untuk perpanjang sewa motor ${transaction.unitMotor.jenis.merk} ${transaction.unitMotor.jenis.model} (${transaction.unitMotor.platNomor}), silahkan kunjungi link berikut:\n\n` +
    `🔗 ${websiteUrl}/perpanjang/${transaction.id}\n\n` +
    `Atau hubungi admin di nomor berikut untuk bantuan:\n` +
    `👨‍💼 *Admin*: ${adminNumber}\n\n` +
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
      '😔 Saat ini semua motor sedang disewa. Silakan hubungi kami untuk informasi lebih lanjut.\n\n';
  } else {
    motorListText += 'Berikut motor yang tersedia:\n\n';

    jenisMotor.forEach((jenis, index) => {
      const jumlahTersedia = jenis.unitMotor?.length || 0;
      if (jumlahTersedia > 0) {
        // Tampilkan juga CC motor untuk informasi lengkap
        motorListText += `${index + 1}. *${jenis.merk} ${jenis.model}* (${jenis.cc}cc) - ${jumlahTersedia} Unit\n`;
      }
    });

    motorListText += '\n📋 Untuk melihat harga sewa, balas dengan *2*';
  }

  return motorListText;
}

/**
 * Template harga sewa motor
 * @param jenisMotor Array jenis motor
 * @returns Text harga sewa
 */
export function getRentalPricesTemplate(jenisMotor: any[]): string {
  let priceText = '💰 *HARGA SEWA MOTOR* 💰\n\n';
  priceText += 'Berikut harga sewa motor per hari:\n\n';

  jenisMotor.forEach((jenis, index) => {
    // Gunakan hargaSewa dari unitMotor pertama jika ada
    const hargaSewa =
      jenis.unitMotor && jenis.unitMotor.length > 0 ? jenis.unitMotor[0].hargaSewa : 0;
    priceText += `${index + 1}. *${jenis.merk} ${jenis.model}* (${jenis.cc}cc) - Rp ${formatCurrency(hargaSewa)}/hari\n`;
  });

  priceText += '\n📱 Untuk info pemesanan, balas dengan *3*';

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
  websiteUrl = 'https://rosantibikemotorent.com'
): string {
  return (
    '📝 *INFO PEMESANAN* 📝\n\n' +
    'Untuk melakukan pemesanan motor, silakan isi data berikut:\n\n' +
    '👤 *Nama Lengkap*\n' +
    '🪪 *No. KTP/SIM*\n' +
    '🏠 *Alamat*\n' +
    '🏍️ *Jenis Motor* yang disewa\n' +
    '📆 *Tanggal Mulai Sewa*\n' +
    '⏱️ *Lama Sewa* (hari)\n\n' +
    `🌐 Kunjungi website kami di ${websiteUrl}\n` +
    '📲 Atau hubungi admin di nomor berikut untuk pemesanan:\n' +
    `👨‍💼 *Admin*: ${adminNumber}`
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
    '📋 *Format*: BOOKING-[kode]\n' +
    '🔖 *Contoh*: BOOKING-A12345'
  );
}

/**
 * Template menu bantuan
 * @returns Text menu bantuan
 */
export function getHelpMenuTemplate(): string {
  return (
    '❓ *MENU BANTUAN* ❓\n\n' +
    'Berikut layanan bantuan yang tersedia:\n\n' +
    '1️⃣ Info Syarat Sewa - Ketik *SYARAT*\n' +
    '2️⃣ Cara Pembayaran - Ketik *BAYAR*\n' +
    '3️⃣ Kontak Admin - Ketik *ADMIN*\n' +
    '4️⃣ FAQ - Ketik *FAQ*\n\n' +
    '🔙 Untuk kembali ke menu utama, ketik *MENU*'
  );
}

/**
 * Template pesan sambutan
 * @returns Text pesan sambutan
 */
export function getWelcomeMessageTemplate(): string {
  return (
    '👋 Selamat datang di *ROSANTIBIKE MOTORRENT*! 🏍️\n\n' +
    '🌟 Kami menyediakan layanan sewa motor berkualitas untuk kebutuhan transportasi Anda.\n\n' +
    '📱 Silakan ketik *MENU* untuk melihat pilihan menu yang tersedia.'
  );
}

/**
 * Template syarat sewa
 * @returns Text syarat sewa
 */
export function getRentalRequirementsTemplate(): string {
  return (
    '📋 *SYARAT SEWA MOTOR* 📋\n\n' +
    'Untuk menyewa motor, Anda memerlukan:\n\n' +
    '1️⃣ KTP asli (wajib)\n' +
    '2️⃣ SIM C yang masih berlaku\n' +
    '3️⃣ Uang jaminan atau barang berharga\n' +
    '4️⃣ DP minimal 30% dari total sewa\n\n' +
    '⚠️ *KETENTUAN*:\n' +
    '• Wajib menggunakan helm yang disediakan\n' +
    '• Batas penggunaan BBM harian (akan dijelaskan saat serah terima)\n' +
    '• Denda keterlambatan pengembalian\n\n' +
    '🔙 Ketik *MENU* untuk kembali ke menu utama'
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
  } = {}
): string {
  const {
    bank = 'BCA',
    accountNumber = '1234567890',
    accountName = 'Rosanti Bike Motorent',
    dpPercentage = 30
  } = paymentInfo;

  return (
    '💸 *CARA PEMBAYARAN* 💸\n\n' +
    '1️⃣ *DP Pemesanan*\n' +
    `• Minimal ${dpPercentage}% dari total biaya sewa\n` +
    '• Transfer ke rekening:\n' +
    `  🏦 *Bank*: ${bank}\n` +
    `  💼 *No. Rekening*: ${accountNumber}\n` +
    `  👤 *Atas Nama*: ${accountName}\n\n` +
    '2️⃣ *Pelunasan*\n' +
    '• Pelunasan dilakukan saat pengambilan motor\n' +
    '• Pembayaran dapat dilakukan dengan tunai atau transfer\n\n' +
    '⚠️ *KETENTUAN*:\n' +
    '• Pembatalan booking: DP tidak dapat dikembalikan\n' +
    '• Perubahan jadwal: minimal 1x24 jam sebelumnya\n\n' +
    '🔙 Ketik *MENU* untuk kembali ke menu utama'
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
  } = {}
): string {
  const {
    name = 'Rosanti Bike Motorent',
    phone = '+628123456789',
    address = 'Jl. Raya No.123, Kota',
    operationalHours = '08:00 - 20:00 WIB',
    socialMedia = {
      instagram: '@rosantibike',
      facebook: 'Rosanti Bike Motorent'
    }
  } = adminInfo;

  return (
    '👨‍💼 *KONTAK ADMIN* 👨‍💼\n\n' +
    `*${name}*\n\n` +
    `📱 *WhatsApp*: ${phone}\n` +
    `🏢 *Alamat*: ${address}\n` +
    `🕒 *Jam Operasional*: ${operationalHours}\n\n` +
    '📱 *Social Media*:\n' +
    `📸 Instagram: ${socialMedia.instagram}\n` +
    `📘 Facebook: ${socialMedia.facebook}\n\n` +
    '🔙 Ketik *MENU* untuk kembali ke menu utama'
  );
}

/**
 * Template FAQ
 * @returns Text FAQ
 */
export function getFAQTemplate(): string {
  return (
    '❓ *FAQ (Pertanyaan Umum)* ❓\n\n' +
    '*1. Berapa DP minimal untuk sewa motor?*\n' +
    'DP minimal adalah 30% dari total biaya sewa.\n\n' +
    '*2. Apakah ada biaya tambahan?*\n' +
    'Biaya tambahan untuk helm dan jas hujan (opsional).\n\n' +
    '*3. Bagaimana jika terlambat mengembalikan?*\n' +
    'Dikenakan denda per jam keterlambatan.\n\n' +
    '*4. Apakah boleh dibawa keluar kota?*\n' +
    'Ya, dengan pemberitahuan sebelumnya.\n\n' +
    '*5. Bagaimana jika terjadi kerusakan?*\n' +
    'Kerusakan akibat penggunaan normal ditanggung kami. Kerusakan akibat kecelakaan/kelalaian ditanggung penyewa.\n\n' +
    '🔙 Ketik *MENU* untuk kembali ke menu utama'
  );
}
