'use client';

import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useUiStore, type Lang } from '@/lib/stores/ui-store';
import { useAuth } from '@/lib/hooks/use-auth';
import { useI18n } from '@/lib/hooks/use-i18n';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { t } = useI18n();

  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const lang = useUiStore((s) => s.lang);
  const setLang = useUiStore((s) => s.setLang);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('settings')}</h1>
        <p className="text-sm text-slate-500">Préférences UI & session.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Interface</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t('dark_mode')}</div>
                <div className="text-xs text-slate-500">Basé sur Tailwind dark class.</div>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={() => toggleTheme()} />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">{t('language')}</div>
                <div className="text-xs text-slate-500">FR / EN / AR (RTL auto)</div>
              </div>
              <div className="w-[180px]">
                <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Langue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Utilisateur</div>
              <div className="font-medium">{user?.email ?? '—'}</div>
              <div className="text-xs text-slate-500 mt-1">Rôle: {user?.role ?? '—'}</div>
            </div>

            <Button variant="destructive" onClick={() => void logout()} className="w-full">
              Se déconnecter
            </Button>

            <p className="text-xs text-slate-500">
              TODO (STEP4): gestion des sessions, reset password, policies, audit logs — côté backend + UI.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

