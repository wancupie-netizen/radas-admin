import 'server-only';
import { cache } from 'react';
import { createClient } from './supabase/server';
import type { User } from '@supabase/supabase-js';
export function isOwner(user: User | null) {
  return !!user && !user.is_anonymous && !!user.email_confirmed_at && user.email?.toLowerCase() === 'wancupie@gmail.com';
}
export const verifiedUser = cache(async () => {
  try {
    const client = await createClient();
    const { data, error } = await client.auth.getUser();
    return error ? null : data.user;
  } catch { return null; }
});
export async function owner() { return isOwner(await verifiedUser()); }
export function allowedOrigin(origin: string | null) {
  if (!origin) return false;
  const allowed = ['https://radas.my', 'https://www.radas.my'];
  if (process.env.VERCEL_URL) allowed.push('https://' + process.env.VERCEL_URL);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) allowed.push('https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (process.env.NODE_ENV !== 'production') allowed.push('http://localhost:3000', 'http://127.0.0.1:3000');
  return allowed.includes(origin);
}
