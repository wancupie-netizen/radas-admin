import 'server-only';
import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

let client: S3Client | undefined;
export function storageConfig() {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!endpoint || !accessKeyId || !secretAccessKey || bucket !== 'radas-admin-storage') throw new Error('R2 configuration unavailable');
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || !/^[a-f0-9]{32}(?:\.(?:eu|us|fedramp))?\.r2\.cloudflarestorage\.com$/.test(url.hostname) || url.username || url.password || url.port || url.search || url.hash || url.pathname !== '/') throw new Error('Invalid R2 endpoint');
  return { endpoint: url.origin, accessKeyId, secretAccessKey, bucket };
}
export function storageClient() {
  if (!client) {
    const config = storageConfig();
    client = new S3Client({ region: 'auto', endpoint: config.endpoint, forcePathStyle: true, maxAttempts: 3,
      requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
  }
  return client;
}
const etag = (value?: string) => (value || '').replace(/^"|"$/g, '');
const quote = (value: string) => value === '*' ? '*' : `"${etag(value)}"`;
type PutOptions = { onlyIf?: { etagMatches?: string; etagDoesNotMatch?: string }; httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> };
export function storageBucket() {
  return {
    async get(key: string, options?: { onlyIf?: { etagMatches?: string } }) {
      try {
        const response = await storageClient().send(new GetObjectCommand({ Bucket: storageConfig().bucket, Key: key,
          IfMatch: options?.onlyIf?.etagMatches ? quote(options.onlyIf.etagMatches) : undefined }));
        const body = response.Body;
        if (!body) throw new Error('Storage response body missing');
        return { key, etag: etag(response.ETag), version: etag(response.ETag), size: response.ContentLength || 0,
          uploaded: response.LastModified || new Date(0),
          httpMetadata: { contentType: response.ContentType, contentLanguage: response.ContentLanguage,
            contentDisposition: response.ContentDisposition, contentEncoding: response.ContentEncoding,
            cacheControl: response.CacheControl, cacheExpiry: response.Expires },
          customMetadata: response.Metadata || {},
          get body() { return body.transformToWebStream(); },
          async text() { return body.transformToString(); },
          async json<T>() { return JSON.parse(await body.transformToString()) as T; },
          async arrayBuffer() { return new Uint8Array(await body.transformToByteArray()).buffer; }
        };
      } catch (error) {
        const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        if (status === 404 || status === 412) return null;
        throw error;
      }
    },
    async put(key: string, value: string | Uint8Array, options: PutOptions = {}) {
      try {
        const result = await storageClient().send(new PutObjectCommand({ Bucket: storageConfig().bucket, Key: key, Body: value,
          ContentType: options.httpMetadata?.contentType, Metadata: options.customMetadata,
          IfMatch: options.onlyIf?.etagMatches ? quote(options.onlyIf.etagMatches) : undefined,
          IfNoneMatch: options.onlyIf?.etagDoesNotMatch ? quote(options.onlyIf.etagDoesNotMatch) : undefined }));
        return { etag: etag(result.ETag) };
      } catch (error) {
        const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        if (status === 409 || status === 412) return null;
        throw error;
      }
    },
    async list(options: { prefix?: string; cursor?: string; limit?: number } = {}) {
      const result = await storageClient().send(new ListObjectsV2Command({ Bucket: storageConfig().bucket,
        Prefix: options.prefix, ContinuationToken: options.cursor, MaxKeys: options.limit || 500 }));
      return { objects: (result.Contents || []).map(object => ({ key: object.Key!, etag: etag(object.ETag),
        version: etag(object.ETag), size: object.Size || 0 })), truncated: !!result.IsTruncated, cursor: result.NextContinuationToken };
    }
  };
}
export type StorageBucket = ReturnType<typeof storageBucket>;
