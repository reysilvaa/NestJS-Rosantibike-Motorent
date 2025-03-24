export enum StatusTransaksi {
  PENDING = 'PENDING',
  AKTIF = 'AKTIF',
  SELESAI = 'SELESAI',
  DIBATALKAN = 'DIBATALKAN',
  OVERDUE = 'OVERDUE',
}

export enum StatusMotor {
  TERSEDIA = 'TERSEDIA',
  DISEWA = 'DISEWA',
  PERBAIKAN = 'PERBAIKAN',
  OVERDUE = 'OVERDUE',
  DIPESAN = 'DIPESAN',
}

export enum StatusArtikel {
  DRAFT = 'DRAFT',
  TERBIT = 'TERBIT',
  ARSIP = 'ARSIP',
}
