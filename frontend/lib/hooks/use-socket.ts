'use client';

import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from './use-auth';

type NotificationPayload = {
  subject: string;
  body?: string;
};

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const url = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!url) return;

    const accessToken = typeof window !== 'undefined' ? window.localStorage.getItem('access_token') : null;

    const newSocket = io(url, {
      auth: { token: accessToken ?? undefined }
    });

    newSocket.on('connect', () => {
      newSocket.emit('join-user-room', user.id);
    });

    newSocket.on('notification', (notification: NotificationPayload) => {
      toast(notification.subject, {
        description: notification.body,
        action: {
          label: 'Voir',
          onClick: () => router.push('/messagerie')
        }
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user, router]);

  return socket;
}

