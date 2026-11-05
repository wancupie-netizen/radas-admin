import { redirect } from 'next/navigation';
import { owner } from '../../../lib/admin-auth';
import { login } from './actions';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await owner()) redirect('/admin');
  const params = await searchParams;
  return <main style={{ maxWidth: 420, margin: '80px auto', padding: 24, fontFamily: 'Arial, sans-serif' }}>
    <h1>RADAS Admin</h1><p>Log masuk menggunakan akaun RADAS pemilik.</p>
    {params.error && <p role="alert">Log masuk gagal. Semak e-mel dan kata laluan, kemudian cuba semula.</p>}
    <form action={login} style={{ display: 'grid', gap: 16 }}>
      <label>E-mel<input name="email" type="email" autoComplete="username" defaultValue="wancupie@gmail.com" required style={{ display: 'block', width: '100%', padding: 10, boxSizing: 'border-box' }} /></label>
      <label>Kata laluan<input name="password" type="password" autoComplete="current-password" maxLength={1024} required style={{ display: 'block', width: '100%', padding: 10, boxSizing: 'border-box' }} /></label>
      <button type="submit" style={{ padding: 12 }}>Log Masuk</button>
    </form>
  </main>;
}
