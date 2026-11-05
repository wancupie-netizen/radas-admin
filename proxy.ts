import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { authConfig, authCookieOptions } from './lib/supabase/config';
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (request.nextUrl.pathname.startsWith('/admin/_next/')) return response;
  let config;
  try { config = authConfig(); } catch { return response; }
  const client = createServerClient(config.url, config.key, { cookieOptions: authCookieOptions, cookies: {
    getAll() { return request.cookies.getAll(); },
    setAll(values) {
      values.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    }
  } });
  try { await client.auth.getUser(); } catch { /* Pages and APIs enforce verified owner access. */ }
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = { matcher: ['/admin/:path*', '/api/:path*'] };
