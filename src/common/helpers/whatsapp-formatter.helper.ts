import { Logger } from '@nestjs/common';

const logger = new Logger('WhatsappFormatter');

export function formatWhatsappNumber(phoneNumber: string): string {
  try {
    if (!phoneNumber) return '';

    const numberParts = phoneNumber.trim().split('@');
    const baseNumber = numberParts[0];

    const cleanBase = baseNumber.startsWith('false_') ? baseNumber.slice(6) : baseNumber;

    const cleanNumber = cleanBase.replaceAll(/[^\d+]/g, '');

    const noPlus = cleanNumber.startsWith('+') ? cleanNumber.slice(1) : cleanNumber;

    const isLocalIndonesia = noPlus.startsWith('0') && noPlus.length >= 10 && noPlus.length <= 13;

    const needsIndonesiaCode =
      !/^[1-9]\d{0,2}/.test(noPlus.slice(0, 3)) && noPlus.length >= 10 && noPlus.length <= 12;

    const finalNumber = isLocalIndonesia
      ? `62${noPlus.slice(1)}`
      : (needsIndonesiaCode
        ? `62${noPlus}`
        : noPlus);

    logger.debug(`Formatted WhatsApp number from ${phoneNumber} to ${finalNumber}`);
    return finalNumber;
  } catch (error) {
    logger.error(`Error formatting WhatsApp number: ${error.message}`);
    return phoneNumber;
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

export function getStatusLabel(status: string): string {
  const statusMap = {
    AKTIF: 'Aktif',
    SELESAI: 'Selesai',
    DIBATALKAN: 'Dibatalkan',
    OVERDUE: 'Terlambat',
  };

  return statusMap[status] || status;
}
