import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('S3_REGION') || 'us-east-1';
    const endpoint = this.configService.get<string>('S3_ENDPOINT') || '';
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY') || '';
    const secretAccessKey = this.configService.get<string>('S3_SECRET_KEY') || '';
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME') || '';

    if (!endpoint || !accessKeyId || !secretAccessKey || !this.bucketName) {
      this.logger.warn('S3 configuration is missing. File uploads will fail.');
    }

    this.s3Client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for Supabase S3
    });
  }

  async uploadFile(file: any, folder: string = 'uploads', bucket?: string): Promise<string> {
    if (!file) {
      throw new Error('File is required');
    }

    const targetBucket = bucket || this.bucketName;
    const fileExtension = file.filename.split('.').pop();
    const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

    // Convert stream to buffer if necessary, but @fastify/multipart returns a stream
    // AWS SDK v3 supports streaming uploads
    const buffer = await file.toBuffer();

    const command = new PutObjectCommand({
      Bucket: targetBucket,
      Key: fileName,
      Body: buffer,
      ContentType: file.mimetype,
      // ACL: 'public-read', // Supabase S3 does not support ACLs via S3 API in the same way AWS does. 
      // Bucket policy controls access. Removing ACL to avoid potential errors or silent failures.
    });

    try {
      this.logger.log(`Uploading file to S3: ${targetBucket}/${fileName}`);
      await this.s3Client.send(command);
      this.logger.log(`File uploaded successfully`);
      // Construct the public URL
      // For Supabase: https://<project_ref>.supabase.co/storage/v1/object/public/<bucket>/<key>
      // Or if using custom S3 endpoint, we might need to construct it differently.
      // Let's assume standard Supabase URL structure if endpoint contains supabase
      
      const endpoint = this.configService.get<string>('S3_ENDPOINT') || '';
      if (endpoint.includes('supabase')) {
         // endpoint is usually https://<project_ref>.supabase.co/storage/v1/s3
         // public url is https://<project_ref>.supabase.co/storage/v1/object/public/<bucket>/<key>
         const projectUrl = endpoint.replace('/storage/v1/s3', '');
         return `${projectUrl}/storage/v1/object/public/${targetBucket}/${fileName}`;
      }

      return `${endpoint}/${targetBucket}/${fileName}`;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw error;
    }
  }
}
