export type Folder = {
  id: string;
  name: string;
  parent_id?: string | null;
  created_at?: string | null;
};

export type DocumentItem = {
  id: string;
  title: string;
  folder_id?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  created_at?: string | null;
};

export type UploadResult = {
  document_id: string;
  upload_url?: string;
  key?: string;
};

export type DownloadResult = {
  url: string;
  expires_in?: number;
};
