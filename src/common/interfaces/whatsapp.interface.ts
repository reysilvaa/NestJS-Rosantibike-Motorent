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

export type WhatsappConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'reconnecting'
  | 'authenticated';

export interface WhatsappSessionResponse {
  status: string;
  qrcode?: string;
}

export interface WhatsappMessageResponse {
  status: string;
  message?: string;
  id?: string;
}

export interface WhatsappMessageData {
  from: string;
  message: string;
  messageData: any;
}

export interface WhatsappConnectionServiceInterface {
  getConnectionStatus(): WhatsappStatus;
  getQrCode(): Promise<string | null>;
  getSessionStatus(): Promise<any>;
  resetConnection(): Promise<void>;
  initialize(): Promise<any>;
  startAllSessions(): Promise<any>;
  getAllSessions(): Promise<any>;
  logoutSession(): Promise<any>;
  closeSession(): Promise<any>;
}
