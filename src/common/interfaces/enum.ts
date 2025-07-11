export const TransaksiStatus = {
    AKTIF: 'AKTIF',
    SELESAI: 'SELESAI',
    OVERDUE: 'OVERDUE',
} as const;

export const MotorStatus = {
    TERSEDIA: 'TERSEDIA',
    DISEWA: 'DISEWA',
    DIPESAN: 'DIPESAN',
    OVERDUE: 'OVERDUE',
} as const;

export const ArtikelStatus = {
    DRAFT: 'DRAFT',
    TERBIT: 'TERBIT',
} as const;

export type TransaksiStatusType = 'AKTIF' | 'SELESAI' | 'OVERDUE';
export type MotorStatusType = 'TERSEDIA' | 'DISEWA' | 'DIPESAN' | 'OVERDUE';
export type ArtikelStatusType = 'DRAFT' | 'TERBIT';