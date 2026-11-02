import {getPage,BOOK} from '../lib/pages';
import {productHTML} from '../lib/product-render';
export const dynamic='force-dynamic';
export async function GET(){const page=await getPage(BOOK);if(!page?.published)return new Response('Halaman belum diterbitkan.',{status:404});return new Response(productHTML(page.published),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})}
