const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function('require', 'exports', code)(name => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'), mocks);
    return require(name);
  }, exports);
  return exports;
}
(async () => {
  const query = load(path.resolve('lib/analytics-query.ts'));
  assert.equal(query.trafficDays('30'), 30);
  assert.equal(query.trafficDays('1'), 1);
  assert.equal(query.trafficDays('999'), 7);
  for (const days of [1, 7, 30]) {
    const requests = query.trafficQueries(days);
    assert.equal(requests.length, 4);
    assert.deepEqual(requests[0].dateRanges, [{ startDate: days === 1 ? 'today' : `${days - 1}daysAgo`, endDate: 'today' }]);
    assert.equal(requests[0].dimensions, undefined, 'summary must deduplicate users across all dates/pages');
    for (const request of requests) {
      const filters = request.dimensionFilter.andGroup.expressions;
      assert.deepEqual(filters[0].filter.inListFilter.values, ['radas.my', 'www.radas.my']);
      assert.equal(filters[1].filter.stringFilter.value, '/p/');
      assert.equal(filters[2].filter.stringFilter.value, 'page_view');
    }
  }
  const rows = [{ dimensionValues: [{ value: '20261105' }], metricValues: [{ value: '2' }, { value: '7' }] }];
  const daily = query.dailyTraffic({ metadata: { timeZone: 'Asia/Kuala_Lumpur' }, rows }, 7, new Date('2026-11-04T18:00:00Z'));
  assert.equal(daily.at(-1).date, '2026-11-05', 'use property day rather than UTC day');
  assert.equal(daily.at(-1).views, 7);
  assert.equal(daily[0].date, '2026-10-30');
  assert.equal(daily[0].views, 0);
  const saved = { property: process.env.GA4_PROPERTY_ID, key: process.env.GA4_SERVICE_ACCOUNT_JSON };
  delete process.env.GA4_PROPERTY_ID; delete process.env.GA4_SERVICE_ACCOUNT_JSON;
  let calls = 0, fail = false;
  class JWT {
    constructor(config) { assert.deepEqual(config.scopes, ['https://www.googleapis.com/auth/analytics.readonly']); }
    async request(request) {
      calls++;
      assert.match(request.url, /^https:\/\/analyticsdata.googleapis.com\/v1beta\/properties\/123456:batchRunReports$/);
      assert.equal(request.data.requests.length, 4);
      if (fail) throw { response: { status: 403, data: 'PRIVATE ERROR BODY' } };
      return { data: { reports: [ { rows: [{ metricValues: [{ value: '2' }, { value: '7' }] }], metadata: { timeZone: 'Asia/Kuala_Lumpur' } }, { rows }, { rows }, { rows } ] } };
    }
  }
  const api = load(path.resolve('lib/analytics.ts'), { 'server-only': {}, 'google-auth-library': { JWT } });
  await assert.rejects(api.getTraffic(7), e => e.code === 'setup');
  process.env.GA4_PROPERTY_ID = 'G-QQPTKC0RM9';
  process.env.GA4_SERVICE_ACCOUNT_JSON = '{}';
  await assert.rejects(api.getTraffic(7), e => e.code === 'credentials');
  process.env.GA4_PROPERTY_ID = '123456';
  process.env.GA4_SERVICE_ACCOUNT_JSON = JSON.stringify({ type: 'service_account', client_email: 'test@example.iam.gserviceaccount.com', private_key: '-----BEGIN PRIVATE KEY-----\nMOCK ONLY\n-----END PRIVATE KEY-----' });
  const [a, b] = await Promise.all([api.getTraffic(7), api.getTraffic(7)]);
  assert.equal(calls, 1, 'deduplicate concurrent reports');
  assert.equal(a.users, 2); assert.equal(a.views, 7); assert.deepEqual(a, b);
  await api.getTraffic(7); assert.equal(calls, 1, 'reuse cached reports');
  fail = true;
  await assert.rejects(api.getTraffic(30), e => e.code === 'access' && !e.message.includes('PRIVATE'));
  const before = calls;
  await assert.rejects(api.getTraffic(30)); assert.equal(calls, before + 1, 'failures must be retried instead of cached as zeros');
  for (const [name, value] of [['GA4_PROPERTY_ID', saved.property], ['GA4_SERVICE_ACCOUNT_JSON', saved.key]]) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
  let ownerAllowed = false, reportReads = 0;
  const page = load(path.resolve('app/admin/traffic/page.tsx'), {
    '../../chatgpt-auth': { requireChatGPTUser: async () => { if (!ownerAllowed) throw Error('LOGIN_REQUIRED'); } },
    '../../../lib/analytics': { AnalyticsError: api.AnalyticsError, getTraffic: async () => { reportReads++; return a; } },
    '../login/actions': { logout: async () => {} }, './traffic.css': {},
  }).default;
  await assert.rejects(page({ searchParams: Promise.resolve({ days: '7' }) }), /LOGIN_REQUIRED/);
  assert.equal(reportReads, 0, 'unauthorized users must not read GA reports');
  ownerAllowed = true;
  const html = require('react-dom/server').renderToStaticMarkup(await page({ searchParams: Promise.resolve({ days: '7' }) }));
  assert.match(html, /Statistik Trafik/);
  assert.match(html, /G-QQPTKC0RM9/);
  assert.match(html, /Sumber trafik/);
  assert.doesNotMatch(html, /BEGIN PRIVATE KEY|gserviceaccount/);
  console.log('PASS: query scope, date ranges, timezone boundaries, unique totals, read-only auth, cache deduplication, setup errors and failure handling.');
})().catch(error => { console.error(error); process.exit(1); });
