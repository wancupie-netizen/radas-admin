import { getPage } from '../../../lib/pages';
import { productHTML } from '../../../lib/product-render';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page?.published) return new Response('Halaman tidak ditemui.', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return new Response(productHTML(page.published, { proxy: true, slug }), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
