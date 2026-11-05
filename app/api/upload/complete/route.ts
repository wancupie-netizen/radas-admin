import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { owner, sameOrigin } from '../../../../lib/content';
import { storageClient, storageConfig } from '../../../../lib/storage';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!await owner() || !sameOrigin(request)) return Response.json({ error: 'Akses pemilik sahaja.' }, { status: 403, headers });
  const text = await request.text();
  if (text.length > 1000) return Response.json({ error: 'Permintaan terlalu besar.' }, { status: 413, headers });
  let key;
  try { key = JSON.parse(text).key; } catch { /* Reject below. */ }
  if (typeof key !== 'string' || !/^media\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(key)) return Response.json({ error: 'Gambar tidak sah.' }, { status: 400, headers });
  try {
    const client = storageClient();
    const bucket = storageConfig().bucket;
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    if (!head.ETag || !head.ContentLength || head.ContentLength < 12 || head.ContentLength > 5 * 1024 * 1024) throw new Error('Invalid size');
    const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key, IfMatch: head.ETag }));
    if (!object.Body) throw new Error('Missing body');
    const bytes = await object.Body.transformToByteArray();
    let extension = '';
    if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) extension = 'png';
    else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) extension = 'jpg';
    else if (new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP') extension = 'webp';
    if (!extension || !key.endsWith('.' + extension) || object.ContentType !== (extension === 'jpg' ? 'image/jpeg' : 'image/' + extension)) throw new Error('Invalid image');
    return Response.json({ src: '/' + key }, { headers });
  } catch { return Response.json({ error: 'Gambar tidak dapat disahkan. Cuba upload semula.' }, { status: 400, headers }); }
}
