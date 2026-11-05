import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { owner, sameOrigin } from '../../../../lib/content';
import { storageClient, storageConfig } from '../../../../lib/storage';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!await owner() || !sameOrigin(request)) return Response.json({ error: 'Akses pemilik sahaja.' }, { status: 403, headers });
  const text = await request.text();
  if (text.length > 1000) return Response.json({ error: 'Permintaan terlalu besar.' }, { status: 413, headers });
  let data;
  try { data = JSON.parse(text); } catch { return Response.json({ error: 'Format tidak sah.' }, { status: 400, headers }); }
  const types: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const extension = data && typeof data.type === 'string' && Object.hasOwn(types, data.type) ? types[data.type] : undefined;
  if (!extension || !Number.isSafeInteger(data.size) || data.size < 12 || data.size > 5 * 1024 * 1024) return Response.json({ error: 'Pilih JPG, PNG atau WebP sehingga 5 MB.' }, { status: 400, headers });
  const key = 'media/' + crypto.randomUUID() + '.' + extension;
  const url = await getSignedUrl(storageClient(), new PutObjectCommand({ Bucket: storageConfig().bucket,
    Key: key, ContentType: data.type, ContentLength: data.size, IfNoneMatch: '*' }), { expiresIn: 120 });
  return Response.json({ key, url }, { headers });
}
