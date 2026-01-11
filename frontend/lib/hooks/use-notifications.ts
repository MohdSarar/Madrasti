'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notificationClient } from '@/lib/api/client';
import type { NotificationItem, SendNotificationInput } from '@/lib/types/notification';

export function useInbox() {
  return useQuery({
    queryKey: ['notifications', 'inbox'],
    queryFn: async () => {
      const data = await notificationClient.get<NotificationItem[]>(`/api/v1/notifications/inbox`);
      return data;
    }
  });
}

export function useSendNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SendNotificationInput) => {
      const data = await notificationClient.post(`/api/v1/notifications/send`, payload);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications', 'inbox'] });
      toast.success('Message envoyé');
    },
    onError: () => toast.error("Erreur lors de l'envoi")
  });
}
