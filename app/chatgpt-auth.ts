import { redirect } from 'next/navigation';
import { owner, verifiedUser } from '../lib/admin-auth';
// Existing pages use this entry point. Identity is now verified by Supabase.
export async function requireChatGPTUser(returnTo: string) {
  if (!await owner()) redirect('/admin/login?next=' + encodeURIComponent(returnTo));
  return verifiedUser();
}
