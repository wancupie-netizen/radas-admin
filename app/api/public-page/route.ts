import {getPage} from '../../../lib/pages';
import {productHTML} from '../../../lib/product-render';
export const dynamic='force-dynamic';
export async function GET(req:Request){const u=new URL(req.url),slug=u.searchParams.get('slug')||'';const page=await getPage(slug);if(!page?.published)return new Response('Halaman tidak ditemui atau belum diterbitkan.',{status:404,headers:{'Cache-Control':'no-store'}});return new Response(productHTML(page.published,{proxy:u.searchParams.get('proxy')==='1',slug}),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})}
