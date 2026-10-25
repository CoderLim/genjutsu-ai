import { resolveR2Endpoint } from '@/lib/r2-endpoint';
import { resolveR2ObjectKey, trimR2PathSlashes } from '@/lib/r2-object-key';
import { buildR2S3ObjectUrl } from '@/lib/r2-signing-config';

import type {
  StorageConfigs,
  StorageDownloadUploadOptions,
  StorageProvider,
  StorageUploadOptions,
  StorageUploadResult,
} from '.';

/**
 * R2 storage provider configs
 * @docs https://developers.cloudflare.com/r2/
 */
export interface R2Configs extends StorageConfigs {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  uploadPath?: string;
  region?: string;
  endpoint?: string;
  publicDomain?: string;
}

/**
 * R2 storage provider implementation
 * @website https://www.cloudflare.com/products/r2/
 */
export class R2Provider implements StorageProvider {
  readonly name = 'r2';
  configs: R2Configs;

  constructor(configs: R2Configs) {
    this.configs = configs;
  }

  private getUploadPath() {
    return trimR2PathSlashes(this.configs.uploadPath || 'uploads');
  }

  private getEndpoint() {
    return resolveR2Endpoint({
      endpoint: this.configs.endpoint,
      accountId: this.configs.accountId,
    });
  }

  private getObjectUrl(key: string, bucket: string) {
    return buildR2S3ObjectUrl(
      { endpoint: this.getEndpoint(), bucket, uploadPath: this.getUploadPath() },
      key
    );
  }

  getPublicUrl = (options: { key: string; bucket?: string }) => {
    const uploadBucket = options.bucket || this.configs.bucket;
    const objectKey = resolveR2ObjectKey(this.getUploadPath(), options.key);
    // CDN public URLs have no bucket component and should not require a S3 endpoint.
    if (this.configs.publicDomain) {
      return `${this.configs.publicDomain.replace(/\/+$/, '')}/${objectKey
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/')}`;
    }
    return this.getObjectUrl(options.key, uploadBucket);
  };

  exists = async (options: { key: string; bucket?: string }) => {
    try {
      const uploadBucket = options.bucket || this.configs.bucket;
      if (!uploadBucket) return false;
      const url = this.getObjectUrl(options.key, uploadBucket);

      const { AwsClient } = await import('aws4fetch');
      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region || 'auto',
      });

      const response = await client.fetch(
        new Request(url, {
          method: 'HEAD',
        })
      );

      return response.ok;
    } catch {
      return false;
    }
  };

  async uploadFile(
    options: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const uploadBucket = options.bucket || this.configs.bucket;
      if (!uploadBucket) {
        return {
          success: false,
          error: 'Bucket is required',
          provider: this.name,
        };
      }

      const bodyArray =
        options.body instanceof Buffer
          ? new Uint8Array(options.body)
          : options.body;

      const uploadPath = this.getUploadPath();

      // R2 endpoint format: https://<accountId>.r2.cloudflarestorage.com
      // Use custom endpoint if provided, otherwise use default
      const url = this.getObjectUrl(options.key, uploadBucket);

      const { AwsClient } = await import('aws4fetch');

      // R2 uses "auto" as region for S3 API compatibility
      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region || 'auto',
      });

      const headers: Record<string, string> = {
        'Content-Type': options.contentType || 'application/octet-stream',
        'Content-Disposition': options.disposition || 'inline',
        'Content-Length': bodyArray.length.toString(),
      };

      const request = new Request(url, {
        method: 'PUT',
        headers,
        body: bodyArray as any,
      });

      const response = await client.fetch(request);

      if (!response.ok) {
        return {
          success: false,
          error: `Upload failed: ${response.statusText}`,
          provider: this.name,
        };
      }

      const publicUrl =
        this.getPublicUrl({ key: options.key, bucket: uploadBucket }) || url;

      return {
        success: true,
        location: url,
        bucket: uploadBucket,
        uploadPath: uploadPath,
        key: options.key,
        filename: options.key.split('/').pop(),
        url: publicUrl,
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }

  async downloadAndUpload(
    options: StorageDownloadUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const response = await fetch(options.url);
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP error! status: ${response.status}`,
          provider: this.name,
        };
      }

      if (!response.body) {
        return {
          success: false,
          error: 'No body in response',
          provider: this.name,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);

      return this.uploadFile({
        body,
        key: options.key,
        bucket: options.bucket,
        contentType: options.contentType,
        disposition: options.disposition,
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }
}

/**
 * Create R2 provider with configs
 */
export function createR2Provider(configs: R2Configs): R2Provider {
  return new R2Provider(configs);
}
