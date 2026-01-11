'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { documentClient } from '@/lib/api/client';
import type { DocumentItem, Folder, DownloadResult } from '@/lib/types/documents';

export function useFolders() {
  return useQuery({
    queryKey: ['documents', 'folders'],
    queryFn: async () => {
      const data = await documentClient.get<Folder[]>(`/api/v1/folders`);
      return data;
    }
  });
}

export function useDocuments(folderId?: string) {
  return useQuery({
    queryKey: ['documents', 'list', folderId],
    queryFn: async () => {
      const url = folderId ? `/api/v1/documents?folder_id=${folderId}` : `/api/v1/documents`;
      const data = await documentClient.get<DocumentItem[]>(url);
      return data;
    }
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { file: File; title?: string; folder_id?: string | null }) => {
      const form = new FormData();
      form.append('file', input.file);
      if (input.title) form.append('title', input.title);
      if (input.folder_id) form.append('folder_id', input.folder_id);

      const data = await documentClient.post(`/api/v1/documents/upload`, form);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Fichier envoyé');
    },
    onError: () => toast.error("Upload échoué")
  });
}

export function useDownloadDocument() {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const data = await documentClient.get<DownloadResult>(`/api/v1/documents/${documentId}/download`);
      return data;
    }
  });
}
