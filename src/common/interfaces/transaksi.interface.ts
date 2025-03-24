import type { Decimal } from '@prisma/client/runtime/library';
import type { StatusTransaksi } from '../enums/status.enum';

export interface TransaksiSewa {
  id: string;
  namaPenyewa: string;
  noWhatsapp: string;
  totalBiaya: Decimal;
  tanggalMulai: Date;
  tanggalSelesai: Date;
  status: StatusTransaksi;
  unitId: string;
}

export interface TransaksiWithRelations extends TransaksiSewa {
  unitMotor: {
    id: string;
    platNomor: string;
    jenis: {
      merk: string;
      model: string;
    };
  };
}
