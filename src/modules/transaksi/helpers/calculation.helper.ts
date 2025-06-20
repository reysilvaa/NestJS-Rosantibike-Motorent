import type { Logger } from '@nestjs/common';

export function hitungDenda(transaksi: any, logger: Logger): number {
  const now = new Date();
  const tanggalSelesai = new Date(transaksi.tanggalSelesai);

  const [jamSelesai, menitSelesai] = transaksi.jamSelesai.split(':').map(Number);
  tanggalSelesai.setHours(jamSelesai, menitSelesai, 0, 0);

  if (now <= tanggalSelesai) {
    return 0;
  }

  const diffMs = now.getTime() - tanggalSelesai.getTime();
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  let fullDays = Math.floor(diffHours / 24);
  let extraHours = diffHours % 24;

  if (extraHours > 6) {
    fullDays += 1;
    extraHours = 0;
  }

  const hargaSewaPerHari = Number(transaksi.unitMotor.hargaSewa);
  const dendaPerJam = 15_000;

  const totalDenda = fullDays * hargaSewaPerHari + extraHours * dendaPerJam;

  logger.log(
    `Perhitungan denda: ${fullDays} hari penuh (${hargaSewaPerHari}/hari) + ${extraHours} jam (${dendaPerJam}/jam) = ${totalDenda}`,
  );

  return totalDenda;
}

export function hitungTotalBiaya(
  tanggalMulai: Date,
  tanggalSelesai: Date,
  jamMulai: string,
  jamSelesai: string,
  hargaSewaPerHari: number,
  logger: Logger,
): number {
  const tanggalJamMulai = new Date(tanggalMulai);
  const tanggalJamSelesai = new Date(tanggalSelesai);

  const [jamMulaiHour, jamMulaiMinute] = jamMulai.split(':').map(Number);
  const [jamSelesaiHour, jamSelesaiMinute] = jamSelesai.split(':').map(Number);

  tanggalJamMulai.setHours(jamMulaiHour, jamMulaiMinute, 0, 0);
  tanggalJamSelesai.setHours(jamSelesaiHour, jamSelesaiMinute, 0, 0);

  const diffHours = Math.max(
    1,
    Math.ceil((tanggalJamSelesai.getTime() - tanggalJamMulai.getTime()) / (1000 * 60 * 60)),
  );

  let fullDays = Math.floor(diffHours / 24);
  let extraHours = diffHours % 24;

  if (extraHours > 6) {
    fullDays += 1;
    extraHours = 0;
  }

  const dendaPerJam = 15_000;

  const baseDailyPrice = fullDays * hargaSewaPerHari;
  const overduePrice = extraHours > 0 ? extraHours * dendaPerJam : 0;

  const totalBiaya = baseDailyPrice + overduePrice;

  logger.log(
    `Perhitungan biaya sewa: ${fullDays} hari (${hargaSewaPerHari}/hari) + ${extraHours} jam (${dendaPerJam}/jam) = ${totalBiaya}`,
  );

  return totalBiaya;
}
