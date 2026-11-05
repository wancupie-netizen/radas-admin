import 'server-only';
import { createHash } from 'node:crypto';
import { JWT } from 'google-auth-library';
import { dailyTraffic, trafficQueries, trafficRows, type GAReport, type TrafficDays } from './analytics-query';

export class AnalyticsError extends Error {
  constructor(public code: 'setup' | 'credentials' | 'access' | 'quota' | 'unavailable') { super(code); }
}
export function analyticsConfig() {
  const property = process.env.GA4_PROPERTY_ID?.trim();
  const raw = process.env.GA4_SERVICE_ACCOUNT_JSON;
  if (!property || !raw) throw new AnalyticsError('setup');
  if (!/^\d+$/.test(property)) throw new AnalyticsError('credentials');
  try {
    const key = JSON.parse(raw);
    if (key.type !== 'service_account' || typeof key.client_email !== 'string' || !key.client_email.endsWith('.gserviceaccount.com') || typeof key.private_key !== 'string' || !key.private_key.includes('BEGIN PRIVATE KEY')) throw Error();
    return { property, email: key.client_email as string, key: key.private_key as string, fingerprint: createHash('sha256').update(property + raw).digest('hex') };
  } catch { throw new AnalyticsError('credentials'); }
}
type Snapshot = Awaited<ReturnType<typeof loadTraffic>>;
const reports = new Map<string, { until: number; value: Promise<Snapshot> }>();
async function loadTraffic(days: TrafficDays, config: ReturnType<typeof analyticsConfig>) {
  const client = new JWT({ email: config.email, key: config.key, scopes: ['https://www.googleapis.com/auth/analytics.readonly'] });
  try {
    const response = await client.request<{ reports: GAReport[] }>({
      url: `https://analyticsdata.googleapis.com/v1beta/properties/${config.property}:batchRunReports`,
      method: 'POST', data: { requests: trafficQueries(days) }, timeout: 20000, retry: false,
    });
    const data = response.data.reports;
    if (!Array.isArray(data) || data.length !== 4) throw new AnalyticsError('unavailable');
    return {
      users: trafficRows(data[0])[0]?.users || 0,
      views: trafficRows(data[0])[0]?.views || 0,
      daily: dailyTraffic(data[1], days), pages: trafficRows(data[2]), sources: trafficRows(data[3]),
      timeZone: data[0].metadata?.timeZone || 'Asia/Kuala_Lumpur', fetchedAt: new Date().toISOString(),
      limited: data.some(r => r.metadata?.subjectToThresholding || r.metadata?.dataLossFromOtherRow || r.metadata?.samplingMetadatas?.length),
    };
  } catch (error) {
    if (error instanceof AnalyticsError) throw error;
    // Never return Google's error body or credentials to the browser/logs.
    const status = (error as { response?: { status?: number } }).response?.status;
    throw new AnalyticsError(status === 403 ? 'access' : status === 429 ? 'quota' : status === 400 || status === 401 ? 'credentials' : 'unavailable');
  }
}
export async function getTraffic(days: TrafficDays) {
  const config = analyticsConfig(), key = `${config.fingerprint}:${days}`;
  const existing = reports.get(key);
  if (existing && existing.until > Date.now()) return existing.value;
  // Small in-process cache; no credentials or report data are placed in public CDN caches.
  for (const [id, report] of reports) if (report.until <= Date.now()) reports.delete(id);
  const value = loadTraffic(days, config);
  reports.set(key, { until: Date.now() + 300000, value });
  try { return await value; } catch (error) { reports.delete(key); throw error; }
}
