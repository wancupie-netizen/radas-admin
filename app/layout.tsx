import type { Metadata } from 'next';
export const metadata: Metadata = { title:'RADAS — Buku Forex & Crypto', description:'Buku Forex & Crypto Bahasa Melayu. RM65 termasuk pos seluruh Malaysia.' };
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ms"><body style={{margin:0}}>{children}</body></html>}
