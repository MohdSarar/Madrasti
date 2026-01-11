export type NotificationItem = {
  id: string;
  recipient_id: string;
  notification_type: string;
  channel: string;
  subject?: string | null;
  body?: string | null;
  created_at?: string | null;
  read_at?: string | null;
};

export type SendNotificationInput = {
  recipient_id: string;
  notification_type: string;
  channels: Array<'in_app' | 'email' | 'sms' | 'push'>;
  data: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
};
