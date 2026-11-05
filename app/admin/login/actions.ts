'use server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { authCookie } from '../../../lib/supabase/config';
import { createClient } from '../../../lib/supabase/server';
import { isOwner } from '../../../lib/admin-auth';
export async function login(form: FormData) {
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  let accepted = false;
  if (email === 'wancupie@gmail.com' && password.length > 0 && password.length <= 1024) {
    try {
      const client = await createClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      accepted = !error && isOwner(data.user);
      if (!accepted && data.session) await client.auth.signOut({ scope: 'local' });
    } catch { /* Use one generic login error. */ }
  }
  if (!accepted) redirect('/admin/login?error=1');
  redirect('/admin');
}
export async function logout() {
  try { const client = await createClient(); await client.auth.signOut({ scope: 'local' }); }
  catch { /* Clear local cookies even if the provider is unavailable. */ }
  finally {
    const store = await cookies();
    for (const cookie of store.getAll()) {
      if (cookie.name === authCookie || cookie.name.startsWith(authCookie + '.')) {
        store.set(cookie.name, '', { path: '/admin', maxAge: 0, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
      }
    }
  }
  redirect('/admin/login');
}
