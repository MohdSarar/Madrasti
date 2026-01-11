'use client';

import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useFolders, useUploadDocument, useDocuments } from '@/lib/hooks/use-documents';

type Folder = {
  id: string;
  name: string;
};

type DocumentItem = {
  id: string;
  name?: string | null;
  filename?: string | null;
  folder_id?: string | null;
  created_at?: string | null;
  url?: string | null;
};

export default function DocumentsPage() {
  const [folderId, setFolderId] = React.useState<string>('all');
  const [q, setQ] = React.useState<string>('');

  const folders = useFolders();
  const upload = useUploadDocument();

  // IMPORTANT: your hook expects a STRING (not an object).
  // We pass 'all' or a real folder id.
  const docs = useDocuments(folderId);

  const folderList = React.useMemo<Folder[]>(() => {
    const raw = (folders.data ?? []) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((x: any) => {
        const o = x as Partial<Folder> & { id?: unknown; name?: unknown };
        const id = typeof o.id === 'string' ? o.id : '';
        const name = typeof o.name === 'string' ? o.name : id;
        return id ? { id, name } : null;
      })
      .filter((x): x is Folder => Boolean(x));
  }, [folders.data]);

  const docList = React.useMemo<DocumentItem[]>(() => {
    const raw = (docs.data ?? []) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.map((x: any) => x as DocumentItem);
  }, [docs.data]);

  const filteredDocs = React.useMemo<DocumentItem[]>(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return docList;

    return docList.filter((d: any) => {
      const name = (d.name ?? d.filename ?? '').toLowerCase();
      return name.includes(needle);
    });
  }, [docList, q]);

  async function onUpload(file: File | null) {
    if (!file) return;

    try {
      await upload.mutateAsync({
        file,
        folder_id: folderId === 'all' ? undefined : folderId,
      });

      await docs.refetch();
    } catch {
      // UI will show error state from the hook if you have it there
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Documents</h1>
          <p className="text-sm text-slate-500">Liste et upload (Document Service).</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Input className="w-[220px]" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" />

          <Select value={folderId} onValueChange={(v) => setFolderId(v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Dossier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {folderList.map((f: Folder) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button asChild variant="secondary">
            <label className="cursor-pointer">
              Upload
              <input type="file" className="hidden" onChange={(e) => onUpload(e.target.files?.[0] ?? null)} />
            </label>
          </Button>

          <Button variant="outline" onClick={() => docs.refetch()}>
            Recharger
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fichiers</CardTitle>
        </CardHeader>
        <CardContent>
          {folders.isLoading || docs.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : folders.isError || docs.isError ? (
            <div className="text-sm text-slate-500">Erreur lors du chargement.</div>
          ) : upload.isPending ? (
            <div className="text-sm text-slate-500">Upload en cours…</div>
          ) : (
            <div className="space-y-2">
              {filteredDocs.length === 0 ? (
                <div className="text-sm text-slate-500">Aucun document.</div>
              ) : (
                filteredDocs.map((d, idx) => (
                  <div
                    key={String(d.id ?? idx)}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{d.name ?? d.filename ?? 'Document'}</div>
                      <div className="text-xs text-slate-500">
                        {d.created_at ? new Date(d.created_at).toLocaleString() : ''}
                      </div>
                    </div>

                    {d.url ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={d.url} target="_blank" rel="noreferrer">
                          Ouvrir
                        </a>
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
