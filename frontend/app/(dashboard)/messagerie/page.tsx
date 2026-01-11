'use client';

import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useInbox, useSendNotification } from '@/lib/hooks/use-notifications';

export default function MessagingPage() {
  const inbox = useInbox();
  const send = useSendNotification();

  const [recipientId, setRecipientId] = React.useState('test');
  const [subject, setSubject] = React.useState('Message');
  const [body, setBody] = React.useState('');

  async function onSend() {
    if (!recipientId.trim() || !body.trim()) return;
    await send.mutateAsync({
      recipient_id: recipientId.trim(),
      notification_type: 'in_app_message',
      channels: ['in_app'],
      data: { subject: subject.trim() || 'Message', body: body.trim(), school_id: 'test' },
      priority: 'normal'
    });
    setBody('');
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Boîte de réception</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {inbox.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : inbox.isError ? (
            <div className="text-sm text-slate-500">Impossible de charger l’inbox.</div>
          ) : (inbox.data?.length ?? 0) === 0 ? (
            <div className="text-sm text-slate-500">Aucun message.</div>
          ) : (
            inbox.data!.slice(0, 20).map((n: any) => (
              <div key={n.id} className="rounded-xl border border-slate-200 p-4">
                <div className="font-medium">{n.subject ?? n.notification_type}</div>
                <div className="text-xs text-slate-500 mt-1">{n.created_at ?? ''}</div>
                <div className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{n.body ?? ''}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nouveau message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <div className="text-xs text-slate-500 mb-1">recipient_id</div>
              <Input value={recipientId} onChange={(e) => setRecipientId(e.target.value)} />
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Sujet</div>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1">Contenu</div>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="Écris ton message…" />
          </div>

          <Button onClick={onSend} disabled={send.isPending || !recipientId.trim() || !body.trim()} className="w-full">
            {send.isPending ? 'Envoi…' : 'Envoyer'}
          </Button>

          <p className="text-xs text-slate-500">
            MVP: messagerie basée sur Notification Service (in_app). Plus tard : threads, pièces jointes, WebSocket.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
