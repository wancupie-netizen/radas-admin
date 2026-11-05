'use client';
import { useState } from 'react';
import { backupFormat, sha256 } from '../../../lib/backup';
export default function BackupCheck() {
  const [message, setMessage] = useState('Belum ada fail disemak.');
  const [busy, setBusy] = useState(false);
  async function verify(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage('Menyemak backup…');
    const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader();
    const manifest: { key: string; size: number; sha256: string }[] = [];
    let expected: number | undefined;
    let complete = false;
    let total = 0;
    let pending = '';
    async function check(line: string) {
      const record = JSON.parse(line);
      if (complete) throw new Error('Ada data selepas rekod pengesahan.');
      if (expected === undefined) {
        if (record.kind !== 'header' || record.format !== backupFormat || !Number.isSafeInteger(record.objects) || record.objects < 0) throw new Error('Format backup tidak sah.');
        expected = record.objects;
        return;
      }
      if (record.kind === 'object') {
        if (typeof record.key !== 'string' || (manifest.length && record.key <= manifest[manifest.length - 1].key)) throw new Error('Susunan objek tidak sah.');
        const bytes = Uint8Array.from(atob(record.data), char => char.charCodeAt(0));
        if (bytes.length !== record.size || await sha256(bytes) !== record.sha256) throw new Error('Checksum objek tidak sepadan.');
        manifest.push({ key: record.key, size: record.size, sha256: record.sha256 });
        total += record.size;
        return;
      }
      if (record.kind !== 'complete' || record.format !== backupFormat || record.objects !== manifest.length || record.objects !== expected || record.bytes !== total || record.manifestSha256 !== await sha256(new TextEncoder().encode(JSON.stringify(manifest)))) throw new Error('Backup tidak lengkap atau telah berubah.');
      complete = true;
    }
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        pending += chunk.value;
        let newline;
        while ((newline = pending.indexOf('\n')) !== -1) {
          const line = pending.slice(0, newline);
          pending = pending.slice(newline + 1);
          if (line.trim()) await check(line);
        }
      }
      if (pending.trim()) await check(pending);
      if (!complete) throw new Error('Muat turun terputus atau rekod pengesahan tiada.');
      setMessage(`Lulus. ${manifest.length} objek, ${total.toLocaleString('en-MY')} bait. Semua checksum sepadan.`);
    } catch (error) {
      setMessage('Gagal. ' + (error instanceof Error ? error.message : 'Fail tidak sah.'));
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
      setBusy(false);
    }
  }
  return <div><input type="file" accept=".ndjson" aria-label="Fail backup RADAS" disabled={busy} onChange={event => void verify(event.target.files?.[0])} /><p role="status">{message}</p></div>;
}
