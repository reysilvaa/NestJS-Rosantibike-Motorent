import type { NotificationType } from '../enums/app.enum';

export interface NotificationData {
  transactionId?: string;
  amount?: number;
  dueDate?: Date;
  [key: string]: any;
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: NotificationData;
}

export interface NotificationResponse {
  success: boolean;
  message?: string;
  error?: string;
}
