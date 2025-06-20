export const successResponse = <T>(data: T, message = 'Operasi berhasil', statusCode = 200) => {
  return {
    statusCode,
    success: true,
    message,
    data,
  };
};

export const paginationResponse = <T>(
  data: T[],
  totalItems: number,
  currentPage: number,
  itemsPerPage: number,
  message = 'Data berhasil diambil',
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

export const errorResponse = (message: string, statusCode = 400, error?: any) => {
  return {
    statusCode,
    success: false,
    message,
    error: error || null,
  };
};
