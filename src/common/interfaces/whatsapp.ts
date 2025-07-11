export type WhatsappConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface WhatsappConfig {
  baseUrl: string;
  session: string;
  secretKey: string;
  adminNumber: string;
  sendDebugMessages: boolean;
  retryDelay: number;
  maxRetries: number;
}

export interface WhatsappStatus {
  status: WhatsappConnectionStatus;
  isConnecting: boolean;
  retryCount: number;
  maxRetries: number;
  reconnectAttemptInProgress: boolean;
  hasQrCode: boolean;
}

export interface WhatsappMessageData {
  from: string;
  message: string;
  messageData?: {
    event?: string;
    [key: string]: any;
  };
}
