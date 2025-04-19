import { Logger } from '@nestjs/common';

const logger = new Logger('WhatsappFormatter');

/**
 * Format nomor WhatsApp untuk memastikan format yang benar
 * @param phoneNumber Nomor telepon yang akan diformat
 * @returns Nomor telepon yang telah diformat
 */
export function formatWhatsappNumber(phoneNumber: string): string {
  try {
    // Early return untuk nilai kosong
    if (!phoneNumber) return '';

    // Ambil bagian sebelum @ jika ada format @c.us atau @s.whatsapp.net
    const numberParts = phoneNumber.trim().split('@');
    const baseNumber = numberParts[0];

    // Hapus semua karakter non-digit
    const cleanNumber = baseNumber.replaceAll(/[^\d+]/g, '');

    // Hapus + di awal jika ada
    const noPlus = cleanNumber.startsWith('+') ? cleanNumber.slice(1) : cleanNumber;

    // Tentukan format akhir berdasarkan pola nomor
    const isLocalIndonesia = noPlus.startsWith('0') && noPlus.length >= 10 && noPlus.length <= 13;

    const needsIndonesiaCode =
      !/^[1-9]\d{0,2}/.test(noPlus.slice(0, 3)) && noPlus.length >= 10 && noPlus.length <= 12;

    // Terapkan transformasi yang diperlukan
    const finalNumber = isLocalIndonesia
      ? `62${noPlus.slice(1)}`
      : // eslint-disable-next-line unicorn/no-nested-ternary
        needsIndonesiaCode
        ? `62${noPlus}`
        : noPlus;

    logger.debug(`Formatted WhatsApp number from ${phoneNumber} to ${finalNumber}`);
    return finalNumber;
  } catch (error) {
    logger.error(`Error formatting WhatsApp number: ${error.message}`);
    return phoneNumber;
  }
}

/**
 * Format mata uang dalam format Indonesia
 * @param amount Jumlah yang akan diformat
 * @returns String dalam format mata uang Indonesia
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

/**
 * Mendapatkan label status yang mudah dibaca
 * @param status Status transaksi
 * @returns Label status yang mudah dibaca
 */
export function getStatusLabel(status: string): string {
  const statusMap = {
    AKTIF: 'Aktif',
    SELESAI: 'Selesai',
    DIBATALKAN: 'Dibatalkan',
    OVERDUE: 'Terlambat',
  };

  return statusMap[status] || status;
}
