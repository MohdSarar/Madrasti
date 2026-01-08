import { z } from "zod";

export const createFolderSchema = z.object({
  school_id: z.string().uuid(),
  parent_folder_id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
});

export const createDocumentSchema = z.object({
  school_id: z.string().uuid(),
  folder_id: z.string().uuid().optional(),
  file_name: z.string().min(1).max(255),
  file_size: z.number().int().min(1),
  file_type: z.string().min(1).max(100),
  file_extension: z.string().max(20).optional(),
  storage_key: z.string().min(1),
  storage_bucket: z.string().min(1).max(100),
  storage_url: z.string().url().optional(),
  uploaded_by: z.string().uuid(),
  tags: z.array(z.string().max(50)).optional(),
  metadata: z.record(z.any()).optional(),
});
