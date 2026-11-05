import type { StorageBucket } from './storage';
export const backupFormat = 'radas-r2-backup-v1';
const encoder = new TextEncoder();
export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function inventory(storage: StorageBucket) {
  const objects: { key: string; etag: string; size: number; version: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await storage.list({ limit: 500, cursor });
    for (const object of page.objects) {
      objects.push({ key: object.key, etag: object.etag, size: object.size, version: object.version });
    }
    if (page.truncated && (!page.cursor || page.cursor === cursor)) throw new Error('Pagination failed');
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return objects.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
}
export async function* backupRecords(storage: StorageBucket, objects: Awaited<ReturnType<typeof inventory>>) {
  yield { kind: 'header', format: backupFormat, startedAt: new Date().toISOString(), objects: objects.length };
  const manifest: { key: string; size: number; sha256: string }[] = [];
  let bytes = 0;
  try {
    for (const expected of objects) {
      if (expected.size > 32 * 1024 * 1024) throw new Error('Object exceeds export size limit');
      const object = await storage.get(expected.key, { onlyIf: { etagMatches: expected.etag } });
      if (!object || !('body' in object) || object.version !== expected.version) throw new Error('Storage changed during export');
      const content = new Uint8Array(await object.arrayBuffer());
      if (content.byteLength !== expected.size) throw new Error('Object size mismatch');
      const hash = await sha256(content);
      let binary = '';
      for (let offset = 0; offset < content.length; offset += 8192) {
        binary += String.fromCharCode(...content.subarray(offset, offset + 8192));
      }
      const entry = { key: object.key, size: content.byteLength, sha256: hash };
      manifest.push(entry);
      bytes += content.byteLength;
      yield { kind: 'object', ...entry, etag: object.etag, version: object.version,
        uploaded: object.uploaded.toISOString(), httpMetadata: object.httpMetadata ?? {},
        customMetadata: object.customMetadata ?? {}, data: btoa(binary) };
    }
    if (JSON.stringify(objects) !== JSON.stringify(await inventory(storage))) throw new Error('Storage changed during export');
    yield { kind: 'complete', format: backupFormat, objects: manifest.length, bytes,
      manifestSha256: await sha256(encoder.encode(JSON.stringify(manifest))), completedAt: new Date().toISOString() };
  } catch {
    yield { kind: 'error', message: 'Backup tidak lengkap. Hentikan edit dan upload sementara, kemudian cuba semula.' };
  }
}
export function backupStream(records: AsyncGenerator): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async pull(controller) {
      try {
        const record = await records.next();
        if (record.done) controller.close();
        else controller.enqueue(encoder.encode(JSON.stringify(record.value) + '\n'));
      } catch (error) { controller.error(error); }
    },
    async cancel() { await records.return(undefined); }
  });
}
