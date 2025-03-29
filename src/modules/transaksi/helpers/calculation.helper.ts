import type { Logger } from '@nestjs/common';

/**
 * Menghitung denda keterlambatan pengembalian
 * Denda: Rp 15.000 per jam untuk keterlambatan 1-6 jam
 * Keterlambatan > 6 jam dihitung sebagai tambahan 1 hari
 */
export function hitungDenda(transaksi: any, logger: Logger): number {
  const now = new Date();
  const tanggalSelesai = new Date(transaksi.tanggalSelesai);

  // Tambahkan jam selesai ke tanggal selesai
  const [jamSelesai, menitSelesai] = transaksi.jamSelesai.split(':').map(Number);
  tanggalSelesai.setHours(jamSelesai, menitSelesai, 0, 0);

  // Jika waktu saat ini belum melewati waktu selesai, tidak ada denda
  if (now <= tanggalSelesai) {
    return 0;
  }

  // Hitung selisih jam, dibulatkan ke atas
  const diffMs = now.getTime() - tanggalSelesai.getTime();
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  // Hitung jumlah hari penuh dan jam tambahan
  let fullDays = Math.floor(diffHours / 24);
  let extraHours = diffHours % 24;

  // Jika keterlambatan lebih dari 6 jam, dihitung sebagai 1 hari penuh
  if (extraHours > 6) {
    fullDays += 1;
    extraHours = 0;
  }

  // Hitung denda
  const hargaSewaPerHari = Number(transaksi.unitMotor.hargaSewa);
  const dendaPerJam = 15_000; // Tarif denda per jam

  // Denda: (hari penuh * harga sewa per hari) + (jam ekstra * denda per jam)
  const totalDenda = fullDays * hargaSewaPerHari + extraHours * dendaPerJam;

  logger.log(
    `Perhitungan denda: ${fullDays} hari penuh (${hargaSewaPerHari}/hari) + ${extraHours} jam (${dendaPerJam}/jam) = ${totalDenda}`,
  );

  return totalDenda;
}

/**
 * Menghitung total biaya sewa
 */
export function hitungTotalBiaya(
  tanggalMulai: Date,
  tanggalSelesai: Date,
  jamMulai: string,
  jamSelesai: string,
  hargaSewaPerHari: number,
  logger: Logger,
): number {
  // Gabungkan tanggal dan jam untuk perhitungan yang lebih akurat
  const tanggalJamMulai = new Date(tanggalMulai);
  const tanggalJamSelesai = new Date(tanggalSelesai);

  // Set jam dari parameter
  const [jamMulaiHour, jamMulaiMinute] = jamMulai.split(':').map(Number);
  const [jamSelesaiHour, jamSelesaiMinute] = jamSelesai.split(':').map(Number);

  tanggalJamMulai.setHours(jamMulaiHour, jamMulaiMinute, 0, 0);
  tanggalJamSelesai.setHours(jamSelesaiHour, jamSelesaiMinute, 0, 0);

  // Hitung total jam
  const diffHours = Math.max(
    1,
    Math.ceil((tanggalJamSelesai.getTime() - tanggalJamMulai.getTime()) / (1000 * 60 * 60)),
  );

  // Hitung jumlah hari penuh dan jam tambahan
  let fullDays = Math.floor(diffHours / 24);
  let extraHours = diffHours % 24;

  // Jika keterlambatan lebih dari 6 jam, dihitung sebagai 1 hari penuh
  if (extraHours > 6) {
    fullDays += 1;
    extraHours = 0;
  }

  // Hitung biaya
  const dendaPerJam = 15_000; // Tarif denda per jam

  // Hitung total biaya: hari penuh + biaya keterlambatan
  const baseDailyPrice = fullDays * hargaSewaPerHari;
  const overduePrice = extraHours > 0 ? extraHours * dendaPerJam : 0;

  const totalBiaya = baseDailyPrice + overduePrice;

  logger.log(
    `Perhitungan biaya sewa: ${fullDays} hari (${hargaSewaPerHari}/hari) + ${extraHours} jam (${dendaPerJam}/jam) = ${totalBiaya}`,
  );

  return totalBiaya;
}
