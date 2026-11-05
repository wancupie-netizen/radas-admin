import { requireChatGPTUser } from '../chatgpt-auth';
import { owner } from '../../lib/content';
import Manager from './manager';
import AdminHeader from './admin-header';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await requireChatGPTUser('/admin');
  if (!await owner()) return <p>Akses pemilik sahaja.</p>;

  return (
    <>
      <AdminHeader active="products" />
      <Manager />
    </>
  );
}