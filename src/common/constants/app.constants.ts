export const APP_CONSTANTS = {
  JWT_STRATEGY: 'jwt',

  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,

  MAX_FILE_SIZE: 5 * 1024 * 1024,
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],

  CACHE_TTL: 60 * 60,

  RATE_LIMIT_WINDOW_MS: 60_000,
  RATE_LIMIT_MAX: 100,

  WHATSAPP_RECONNECT_INTERVAL: 5000,
  WHATSAPP_MAX_RECONNECT_ATTEMPTS: 5,

  TRANSACTION_STATUS: {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    ONGOING: 'ONGOING',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
  },

  PAYMENT_STATUS: {
    PENDING: 'PENDING',
    PAID: 'PAID',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED',
  },

  PAYMENT_METHOD: {
    CASH: 'CASH',
    TRANSFER: 'TRANSFER',
    E_WALLET: 'E_WALLET',
  },

  USER_ROLE: {
    ADMIN: 'ADMIN',
    CUSTOMER: 'CUSTOMER',
  },

  FILE_TYPE: {
    IMAGE: 'IMAGE',
    DOCUMENT: 'DOCUMENT',
    OTHER: 'OTHER',
  },

  NOTIFICATION_TYPE: {
    TRANSACTION_CREATED: 'TRANSACTION_CREATED',
    TRANSACTION_CONFIRMED: 'TRANSACTION_CONFIRMED',
    TRANSACTION_COMPLETED: 'TRANSACTION_COMPLETED',
    TRANSACTION_CANCELLED: 'TRANSACTION_CANCELLED',
    PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    RETURN_REMINDER: 'RETURN_REMINDER',
    OVERDUE_NOTIFICATION: 'OVERDUE_NOTIFICATION',
  },
} as const;
