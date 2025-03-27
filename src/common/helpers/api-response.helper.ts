/**
 * Format response sukses dengan struktur standar
 * @param data Data yang akan dikembalikan
 * @param message Pesan sukses
 * @param statusCode Kode HTTP status (default: 200)
 * @returns Object response standar
 */
export const successResponse = <T>(
  data: T,
  message = 'Operasi berhasil',
  statusCode = 200
) => {
  return {
    statusCode,
    success: true,
    message,
    data,
  };
};

/**
 * Format response pagination dengan struktur standar
 * @param data Data yang akan ditampilkan dalam halaman
 * @param totalItems Total item
 * @param currentPage Halaman saat ini
 * @param itemsPerPage Jumlah item per halaman
 * @param message Pesan sukses
 * @returns Object response pagination standar
 */
export const paginationResponse = <T>(
  data: T[],
  totalItems: number,
  currentPage: number,
  itemsPerPage: number,
  message = 'Data berhasil diambil'
) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  return {
    statusCode: 200,
    success: true,
    message,
    data,
    meta: {
      totalItems,
      itemsPerPage,
      totalPages,
      currentPage,
    },
  };
};

/**
 * Format response error dengan struktur standar
 * @param message Pesan error
 * @param statusCode Kode HTTP status (default: 400)
 * @param error Object error
 * @returns Object response error standar
 */
export const errorResponse = (
  message: string,
  statusCode = 400,
  error?: any
) => {
  return {
    statusCode,
    success: false,
    message,
    error: error || null,
  };
}; 