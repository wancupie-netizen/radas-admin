import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { authConfig, authCookieOptions } from './config';
export async function createClient() {
  const store = await cookies();
  const { url, key } = authConfig();
  return createServerClient(url, key, { cookieOptions: authCookieOptions, cookies: {
    getAll() { return store.getAll(); },
    setAll(values) {
      try { values.forEach(({ name, value, options }) => store.set(name, value, options)); }
      catch { /* Read-only Server Components receive refreshed cookies from proxy.ts. */ }
    }
  } });
}
