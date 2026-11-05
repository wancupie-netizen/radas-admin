export type TrafficDays = 1 | 7 | 30;
export function trafficDays(value: unknown): TrafficDays {
  return value === '1' ? 1 : value === '30' ? 30 : 7;
}
export function trafficQueries(days: TrafficDays) {
  const common = {
    dateRanges: [{ startDate: days === 1 ? 'today' : `${days - 1}daysAgo`, endDate: 'today' }],
    dimensionFilter: { andGroup: { expressions: [
      { filter: { fieldName: 'hostName', inListFilter: { values: ['radas.my', 'www.radas.my'], caseSensitive: false } } },
      { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/p/', caseSensitive: true } } },
      { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'page_view' } } },
    ] } },
  };
  const metrics = [{ name: 'totalUsers' }, { name: 'screenPageViews' }];
  return [
    { ...common, metrics },
    { ...common, dimensions: [{ name: 'date' }], metrics, orderBys: [{ dimension: { dimensionName: 'date' } }], limit: '30' },
    { ...common, dimensions: [{ name: 'pagePath' }], metrics, orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: '100' },
    { ...common, dimensions: [{ name: 'sessionSourceMedium' }], metrics, orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: '20' },
  ];
}
export type GAReport = {
  rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[];
  metadata?: { timeZone?: string; subjectToThresholding?: boolean; dataLossFromOtherRow?: boolean; samplingMetadatas?: unknown[] };
};
export function trafficRows(report: GAReport) {
  return (report.rows || []).map(row => ({
    label: row.dimensionValues?.[0]?.value || '(not set)',
    users: Number(row.metricValues?.[0]?.value || 0),
    views: Number(row.metricValues?.[1]?.value || 0),
  }));
}
// Use GA's property timezone; users across dates/pages must never be summed for the summary.
export function dailyTraffic(report: GAReport, days: TrafficDays, now = new Date()) {
  const zone = report.metadata?.timeZone || 'Asia/Kuala_Lumpur';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  const today = new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00Z`);
  const rows = new Map(trafficRows(report).map(row => [row.label, row]));
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(today); date.setUTCDate(today.getUTCDate() - days + 1 + i);
    const iso = date.toISOString().slice(0, 10), key = iso.replaceAll('-', '');
    return { date: iso, users: rows.get(key)?.users || 0, views: rows.get(key)?.views || 0 };
  });
}
