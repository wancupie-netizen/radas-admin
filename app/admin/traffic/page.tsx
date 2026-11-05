import { requireChatGPTUser } from '../../chatgpt-auth';
import { AnalyticsError, getTraffic } from '../../../lib/analytics';
import { trafficDays } from '../../../lib/analytics-query';
import { logout } from '../login/actions';
import './traffic.css';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const number = (value: number) => value.toLocaleString('en-MY');
const errors = {
  setup: 'Sambungan GA4 belum disediakan. Tetapkan GA4_PROPERTY_ID dan GA4_SERVICE_ACCOUNT_JSON dalam Vercel, kemudian deploy semula.',
  credentials: 'Tetapan GA4 tidak sah. Semak Property ID bernombor dan kunci service account di Vercel.',
  access: 'Akses GA4 ditolak. Aktifkan Google Analytics Data API dan beri service account peranan Viewer pada property yang betul.',
  quota: 'Had permintaan GA4 dicapai. Cuba semula sebentar lagi.',
  unavailable: 'Statistik GA4 belum dapat dimuatkan. Cuba semula sebentar lagi.',
};
export default async function TrafficPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireChatGPTUser('/admin/traffic');
  const days = trafficDays((await searchParams).days);
  let stats: Awaited<ReturnType<typeof getTraffic>> | undefined, error = '';
  try { stats = await getTraffic(days); } catch (e) { error = errors[e instanceof AnalyticsError ? e.code : 'unavailable']; }
  const max = Math.max(1, ...stats?.daily.map(d => d.views) || []);
  return <main className="traffic">
    <header className="traffic-header"><div><p>RADAS / ANALYTICS</p><h1>Statistik Trafik</h1></div><form action={logout}><button>Log Keluar</button></form></header>
    <nav className="traffic-nav" aria-label="Admin"><a href="/admin">Urus Produk</a><a href="/admin/traffic" aria-current="page">Statistik Trafik</a></nav>
    <section className="traffic-heading"><div><h2>Prestasi halaman produk</h2><p>GA4 · G-QQPTKC0RM9 · radas.my/p/…</p></div><nav aria-label="Tempoh statistik">{([1, 7, 30] as const).map(value => <a key={value} href={`/admin/traffic?days=${value}`} aria-current={days === value ? 'page' : undefined}>{value === 1 ? 'Hari ini' : `${value} hari`}</a>)}</nav></section>
    {error && <section className="traffic-card" role="status"><h2>Statistik belum tersedia</h2><p>{error}</p><p>Tiada angka dipaparkan sehingga data sebenar GA4 dapat dibaca.</p><a href={`/admin/traffic?days=${days}`}>Cuba semula</a></section>}
    {stats && <>
      <div className="traffic-summary"><section className="traffic-card"><h2>Pelawat</h2><strong>{number(stats.users)}</strong><p>Pengguna unik bagi tempoh dipilih</p></section><section className="traffic-card"><h2>Paparan halaman</h2><strong>{number(stats.views)}</strong><p>Termasuk paparan berulang</p></section></div>
      {stats.views === 0 && <p className="traffic-note" role="status">GA4 belum merekod paparan produk untuk tempoh ini. Data hari ini mungkin masih diproses.</p>}
      <section className="traffic-card"><h2>Paparan harian</h2><div className="traffic-chart" role="img" aria-label={`Graf paparan harian untuk ${days} hari. Nilai tepat tersedia dalam jadual harian di bawah.`}>{stats.daily.map(day => <div key={day.date} className="traffic-column"><span>{number(day.views)}</span><div className="traffic-track"><div style={{ height: `${day.views / max * 100}%` }} /></div><small>{day.date.slice(8)}/{day.date.slice(5, 7)}</small></div>)}</div><details><summary>Lihat jadual harian</summary><div className="traffic-scroll"><table><caption>Pelawat dan paparan mengikut hari</caption><thead><tr><th>Tarikh</th><th>Pelawat</th><th>Paparan</th></tr></thead><tbody>{stats.daily.map(day => <tr key={day.date}><td>{day.date}</td><td>{number(day.users)}</td><td>{number(day.views)}</td></tr>)}</tbody></table></div></details></section>
      <div className="traffic-grid"><section className="traffic-card"><h2>Trafik mengikut produk</h2><p>Sehingga 100 halaman teratas</p><div className="traffic-scroll"><table><caption>Halaman produk</caption><thead><tr><th>Halaman</th><th>Pelawat</th><th>Paparan</th></tr></thead><tbody>{stats.pages.map(row => <tr key={row.label}><td>{row.label}</td><td>{number(row.users)}</td><td>{number(row.views)}</td></tr>)}</tbody></table>{stats.pages.length === 0 && <p>Belum ada data halaman.</p>}</div></section><section className="traffic-card"><h2>Sumber trafik</h2><p>Sehingga 20 sumber / medium teratas</p><div className="traffic-scroll"><table><caption>Sumber / medium sesi bagi paparan produk</caption><thead><tr><th>Sumber / medium</th><th>Pelawat</th><th>Paparan</th></tr></thead><tbody>{stats.sources.map(row => <tr key={row.label}><td>{row.label}</td><td>{number(row.users)}</td><td>{number(row.views)}</td></tr>)}</tbody></table>{stats.sources.length === 0 && <p>Belum ada data sumber.</p>}</div></section></div>
      <footer className="traffic-note"><p>Dibaca pada {new Date(stats.fetchedAt).toLocaleString('en-MY', { timeZone: stats.timeZone })} · Zon waktu property: {stats.timeZone} · Cache sehingga 5 minit.</p><p>Tempoh termasuk hari ini. Data GA4 bukan masa nyata. Pelawat yang sama boleh muncul pada beberapa hari, produk atau sumber; jumlah pelawat keseluruhan dikira berasingan. Trafik admin dan domain preview tidak termasuk.</p>{stats.limited && <p>GA4 melaporkan threshold, sampling atau pengagregatan pada sebahagian data ini.</p>}</footer>
    </>}
  </main>;
}
