import { owner, bucket } from '../../../lib/content';
import { inventory, backupRecords, backupStream } from '../../../lib/backup';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET() {
  if (!await owner()) return Response.json({ error: 'Akses pemilik sahaja.' }, { status: 403, headers });
  try {
    const storage = bucket();
    const objects = await inventory(storage);
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    return new Response(backupStream(backupRecords(storage, objects)), { headers: {
      ...headers, 'Content-Type': 'application/x-ndjson',
      'Content-Disposition': `attachment; filename="radas-backup-${date}.ndjson"`
    } });
  } catch {
    return Response.json({ error: 'Backup gagal dimulakan. Cuba semula.' }, { status: 503, headers });
  }
}
