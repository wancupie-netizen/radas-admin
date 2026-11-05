import { requireChatGPTUser } from '../../chatgpt-auth';
import { owner } from '../../../lib/content';
import BackupCheck from './verify';
export const dynamic = 'force-dynamic';
export default async function Page() {
  await requireChatGPTUser('/admin/backup');
  if (!await owner()) return <p>Akses pemilik sahaja.</p>;
  return <main style={{ maxWidth: 720, margin: '40px auto', padding: 24 }}>
    <a href="/admin">â† Pengurus Halaman</a>
    <h1>Backup RADAS</h1>
    <p>Muat turun semua produk, draf, versi terdahulu dan gambar dalam storage. Fail backup mengandungi metadata dan checksum setiap objek.</p>
    <p>Hentikan edit, publish dan upload sepanjang muat turun supaya salinan dapat disahkan lengkap.</p>
    <p><a href="/api/backup">Muat Turun Backup</a></p>
    <h2>Semak fail selepas muat turun</h2>
    <p>Pilih fail backup di bawah. Semakan berjalan pada peranti anda.</p>
    <BackupCheck />
  </main>;
}
