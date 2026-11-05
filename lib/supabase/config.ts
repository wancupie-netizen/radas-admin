export const authCookie = 'radas-admin-auth';
export function authConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (url !== 'https://fyqvvkpzcwrmyozxlqkw.supabase.co' || !key || !(key.startsWith('sb_publishable_') || key.startsWith('eyJ'))) throw new Error('Supabase configuration unavailable');
  if (key.startsWith('eyJ')) {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'));
    if (payload.role !== 'anon') throw new Error('A publishable or anon key is required');
  }
  return { url, key };
}
export const authCookieOptions = { name: authCookie, path: '/admin', httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' };
