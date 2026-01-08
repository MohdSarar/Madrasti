import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
});

export const S3_BUCKET = process.env.S3_BUCKET || "madrasti-documents";

export function isS3Configured(): boolean {
  return Boolean(
    process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY &&
      process.env.S3_BUCKET
  );
}

export class S3Service {
  static async uploadFile(
    file: Express.Multer.File,
    schoolId: string,
    uploadedBy: string
  ): Promise<{ key: string; url: string; bucket: string }> {
    const ext = path.extname(file.originalname);
    const key = `${schoolId}/documents/${uuidv4()}${ext}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          school_id: schoolId,
          uploaded_by: uploadedBy,
          original_name: file.originalname,
        },
      })
    );

    const url = await this.getDownloadUrl(key);
    return { key, url, bucket: S3_BUCKET };
  }

  static async getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn });
  }

  static async deleteFile(key: string): Promise<void> {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );
  }
}
