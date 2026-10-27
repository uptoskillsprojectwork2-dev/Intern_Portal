import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';

const frontendUrl = process.env.TASKG_FRONTEND_URL || 'http://127.0.0.1:5173';
const downloadDir = path.resolve(process.cwd(), '.tmp-taskg-browser-downloads');
const leaderId = '65a000000000000000000001';
const requestUrls = [];
let trendFailuresLeft = 1;
const waitUntil = async (predicate, label) => {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const fixtures = {
  overview: { kpis: { totalInterns: 2, ongoingInterns: 2, activeInterns: 2, upcomingInterns: 0, completedInterns: 0, cancelledInterns: 0, totalTeamLeaders: 1, pendingRequests: 1, approvedRequests: 1, forwardedRequests: 1, requestsThisMonth: 5, certificatesIssuedThisMonth: 1, approvalRate: 50, rejectionRate: 50, avgTurnaroundHours: 24 }, changes: { requests: 10, certificates: 0 } },
  trend: { labels: ['2026-10'], series: [{ status: 'pending', name: 'Pending', data: [1] }], raw: [{ period: '2026-10', pending: 1, approved: 1, rejected: 2, processing: 1, completed: 0, cancelled: 0, total: 5 }] },
  types: { total: 1, breakdown: [{ certificateType: 'completion_certificate', count: 1, percentage: 100 }] },
  turnaround: { tlDecisionTime: { avg: 8, median: 8, p90: 8 }, adminDecisionTime: { avg: 12, median: 12, p90: 12 }, generationTime: { avg: 4, median: 4, p90: 4 }, totalTurnaround: { avg: 24, median: 24, p90: 24 } },
  teamLeaders: [{ id: leaderId, fullName: 'Fixture Team Leader', internsAssigned: 2, requestsReceived: 5, requestsForwarded: 2, requestsRejected: 1, requestsReviewed: 3, pendingReviews: 1, avgReviewTimeHours: 8, rejectionRate: 33.3, hasOverdueRequests: false, maxPendingDays: 1 }],
  domains: { domains: [{ domain: 'Engineering', totalInterns: 2, activeInterns: 2, certificatesCount: 1 }] },
  pipeline: { pipeline: [
    { stage: 'With Team Leader', status: 'pending', count: 1 }, { stage: 'With Admin', status: 'processing', count: 1 },
    { stage: 'Awaiting finalization', status: 'approved', count: 1 }, { stage: 'Completed & Issued', status: 'completed', count: 0 },
    { stage: 'Rejected by Team Leader', status: 'rejected-tl', count: 1 }, { stage: 'Rejected by Admin', status: 'rejected-admin', count: 1 },
    { stage: 'Cancelled', status: 'cancelled', count: 0 }
  ], failedGenerations: 0 }
};

function responseHeaders(contentType = 'application/json') {
  return {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': frontendUrl,
    'Access-Control-Allow-Credentials': 'true'
  };
}

await fs.rm(downloadDir, { recursive: true, force: true });
await fs.mkdir(downloadDir, { recursive: true });
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
try {
  const context = await browser.createBrowserContext();
  await context.setDownloadBehavior({ policy: 'allow', downloadPath: downloadDir });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', (error) => console.error('[browser page error]', error.message));
  page.on('console', (message) => { if (message.type() === 'error') console.error('[browser console]', message.text()); });
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://localhost:3000') return request.continue();
    requestUrls.push(url);
    if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers: { ...responseHeaders(), 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' } });
    const json = (body, status = 200) => request.respond({ status, headers: responseHeaders(), body: JSON.stringify(body) });
    if (url.pathname === '/api/auth/get-me') {
      await new Promise((resolve) => setTimeout(resolve, 900));
      return json({ id: 'admin-fixture', fullName: 'Analytics Admin', email: 'admin@example.test', role: 'admin' });
    }
    if (url.pathname === '/api/admin/teamleaders') return json({ teamLeaders: [{ id: leaderId, fullName: 'Fixture Team Leader' }] });
    if (url.pathname === '/api/admin/analytics/export') {
      const format = url.searchParams.get('format');
      const type = url.searchParams.get('type');
      return request.respond({ status: 200, headers: { ...responseHeaders(format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'), 'Content-Disposition': `attachment; filename="fixture.${format}"` }, body: format === 'xlsx' ? 'fixture-xlsx' : 'metric,value\nfixture,1\n' });
    }
    if (url.pathname === '/api/admin/analytics/requests') return json({ success: true, data: { requests: [], page: 1, limit: 25, total: 0, pages: 0 } });
    if (url.pathname.endsWith('/requests-trend') && trendFailuresLeft > 0) {
      trendFailuresLeft -= 1;
      await new Promise((resolve) => setTimeout(resolve, 900));
      return json({ message: 'Fixture analytics failure' }, 500);
    }
    if (url.pathname.endsWith('/overview')) return json({ success: true, data: fixtures.overview });
    if (url.pathname.endsWith('/requests-trend')) return json({ success: true, data: fixtures.trend });
    if (url.pathname.endsWith('/certificate-types')) return json({ success: true, data: fixtures.types });
    if (url.pathname.endsWith('/turnaround')) return json({ success: true, data: fixtures.turnaround });
    if (url.pathname.endsWith('/team-leaders')) return json({ success: true, data: fixtures.teamLeaders });
    if (url.pathname.endsWith('/domains')) return json({ success: true, data: fixtures.domains });
    if (url.pathname.endsWith('/pipeline')) return json({ success: true, data: fixtures.pipeline });
    if (url.pathname.endsWith('/upcoming-completions')) return json({ success: true, data: [] });
    if (url.pathname.endsWith('/stuck')) return json({ success: true, data: [] });
    if (url.pathname === '/api/notifications/unread-count') return json({ count: 0 });
    return json({ message: 'Unmocked browser smoke API route' }, 404);
  });

  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`${frontendUrl}/admin/dashboard?view=analytics`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.body.innerText.includes('Loading...'));
  await page.waitForFunction(() => document.body.innerText.includes('Admin Analytics'));
  await page.waitForFunction(() => document.body.innerText.includes('Fixture analytics failure'));
  await page.locator('button.retry-btn').click();
  await page.waitForFunction(() => document.body.innerText.includes('Certificate Requests Trend Over Time'));
  await page.waitForFunction(() => document.body.innerText.includes('No upcoming completions found for this filter'));
  await page.waitForFunction(() => document.body.innerText.includes('No stuck requests!'));

  await page.evaluate(() => [...document.querySelectorAll('.control-preset-btn')].find((button) => button.textContent.trim() === '30 Days')?.click());
  await page.select('select[aria-label="Filter by Domain"]', 'Engineering');
  await page.select('select[aria-label="Filter by Team Leader"]', leaderId);
  await page.waitForFunction(() => location.search.includes('range=30d') && location.search.includes('domain=Engineering') && location.search.includes('teamLeaderId='));
  await waitUntil(() => requestUrls.some((url) => url.pathname.endsWith('/overview') && url.searchParams.get('range') === '30d' && url.searchParams.get('domain') === 'Engineering' && url.searchParams.has('teamLeaderId')), 'date/domain/Team Leader filtered overview request');

  const clickPipelineRejection = async (index) => {
    const clicked = await page.evaluate((shapeIndex) => {
      const card = [...document.querySelectorAll('.chart-card')].find((node) => node.innerText.includes('Request Pipeline & Bottlenecks'));
      const shapes = card?.querySelectorAll('g.recharts-bar-rectangle') || [];
      const shape = shapes[shapeIndex];
      if (!shape) {
        const svg = card?.querySelector('svg');
        const all = [...(svg?.querySelectorAll('*') || [])];
        return { width: 0, height: 0, debug: { cardText: card?.innerText, shapeCount: shapes.length, svgShapes: document.querySelectorAll('.recharts-rectangle').length, barNodes: all.filter((node) => String(node.getAttribute('class') || '').includes('bar')).map((node) => `${node.tagName}.${node.getAttribute('class')}`).slice(0, 20), svg: svg?.innerHTML.slice(-1800) } };
      }
      const rect = shape.getBoundingClientRect();
      shape.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true }));
      return { width: rect.width, height: rect.height, debug: { shapeCount: shapes.length } };
    }, index);
    assert.ok(clicked && clicked.debug?.shapeCount > index, `Pipeline rejection bar ${index} must exist: ${JSON.stringify(clicked)}`);
  };
  const waitForPipelineBars = async () => page.waitForFunction(() => {
    const card = [...document.querySelectorAll('.chart-card')].find((node) => node.innerText.includes('Request Pipeline & Bottlenecks'));
    return card && card.querySelectorAll('g.recharts-bar-rectangle').length > 4;
  });
  await waitForPipelineBars();
  await clickPipelineRejection(3);
  await page.waitForFunction(() => location.search.includes('reviewStage=team-leader'));
  await waitUntil(() => requestUrls.some((url) => url.pathname.endsWith('/requests') && url.searchParams.get('reviewStage') === 'team-leader'), 'Team Leader rejection request API call');
  await page.locator('.analytics-back-button').click();
  await waitForPipelineBars();
  await clickPipelineRejection(4);
  await page.waitForFunction(() => location.search.includes('reviewStage=admin'));
  await waitUntil(() => requestUrls.some((url) => url.pathname.endsWith('/requests') && url.searchParams.get('reviewStage') === 'admin'), 'Admin rejection request API call');
  await page.locator('.analytics-back-button').click();

  await page.locator('button[aria-label="Export requests-trend as CSV"]').click();
  await page.locator('button[aria-label="Export requests-trend as Excel"]').click();
  await waitUntil(() => requestUrls.some((url) => url.pathname.endsWith('/export') && url.searchParams.get('format') === 'csv') && requestUrls.some((url) => url.pathname.endsWith('/export') && url.searchParams.get('format') === 'xlsx'), 'CSV and XLSX export API calls');
  let downloaded = [];
  const downloadDeadline = Date.now() + 10000;
  while (Date.now() < downloadDeadline) {
    downloaded = await fs.readdir(downloadDir);
    if (downloaded.some((name) => name.endsWith('.csv')) && downloaded.some((name) => name.endsWith('.xlsx'))) break;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.ok(downloaded.some((name) => name.endsWith('.csv')));
  assert.ok(downloaded.some((name) => name.endsWith('.xlsx')));

  await page.locator('.theme-toggle').click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
  await page.locator('.theme-toggle').click();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark');
  await page.setViewport({ width: 390, height: 844 });
  await new Promise((resolve) => setTimeout(resolve, 300));
  const mobileLayout = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  assert.ok(mobileLayout.scrollWidth <= mobileLayout.width + 1, `Unexpected mobile horizontal overflow: ${JSON.stringify(mobileLayout)}`);

  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${frontendUrl}/admin/certificate-templates`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.innerText.includes('Certificate Template Editor'));
  await page.goto(`${frontendUrl}/admin/certificates/browser-fixture/review`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.innerText.includes('Review Certificate Draft'));

  console.info(JSON.stringify({
    result: 'PASS',
    browser: await browser.version(),
    checks: ['dashboard render', 'loading and error/retry', 'empty states', 'date/domain/Team Leader filters', 'separate TL/Admin rejection drill-down', 'CSV and XLSX downloads', 'dark/light theme toggle', '390px responsive width', 'lazy certificate template route', 'lazy certificate review route'],
    observedAnalyticsRequests: requestUrls.filter((url) => url.pathname.includes('/api/admin/analytics/')).length,
    downloaded
  }, null, 2));
  await context.close();
} finally {
  await browser.close();
}
