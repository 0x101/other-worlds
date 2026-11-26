import { spawn, execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const root = process.cwd();
const mode = process.argv.includes('--preview') ? 'preview' : 'development';
const evidenceDir = path.join(root, 'evidence');
const base = 'http://127.0.0.1:7100';
const checks = [];
const consoleErrors = [];
const pageErrors = [];
const failedResponses = [];
const performance = {};
let server;
let browser;

function check(name, pass, details = null) {
  checks.push({ name, pass: Boolean(pass), details });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${details ? ` — ${JSON.stringify(details)}` : ''}`);
}

function watch(page, label) {
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push({ page: label, text: message.text() }); });
  page.on('pageerror', (error) => pageErrors.push({ page: label, text: error.message }));
  page.on('response', (response) => { if (response.status() >= 400) failedResponses.push({ page: label, status: response.status(), url: response.url() }); });
}

async function ready(page, view) {
  await page.waitForFunction((expected) => window.__OTHER_WORLDS__?.ready && window.__OTHER_WORLDS__?.view === expected, view, { timeout: 30_000 });
  await page.waitForTimeout(2100);
}

async function shot(page, name) {
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(evidenceDir, `${name}.png`), fullPage: true, animations: 'disabled' });
}

async function noOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, height: window.innerHeight, scrollHeight: document.documentElement.scrollHeight }));
  check(`${label}: no page overflow`, dimensions.scrollWidth <= dimensions.width && dimensions.scrollHeight <= dimensions.height, dimensions);
}

async function stopServer(child) {
  if (!child?.pid) return;
  const rootPid = child.pid;
  const descendants = () => {
    try {
      const rows = execFileSync('ps', ['-eo', 'pid=,ppid='], { encoding: 'utf8' }).trim().split('\n').map((line) => line.trim().split(/\s+/).map(Number));
      const result = new Set();
      let changed = true;
      while (changed) {
        changed = false;
        for (const [pid, ppid] of rows) {
          if ((ppid === rootPid || result.has(ppid)) && !result.has(pid)) { result.add(pid); changed = true; }
        }
      }
      return [...result].reverse();
    } catch { return []; }
  };
  for (const pid of descendants()) { try { process.kill(pid, 'SIGTERM'); } catch { /* already stopped */ } }
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 4000)),
  ]);
  for (const pid of descendants()) { try { process.kill(pid, 'SIGKILL'); } catch { /* already stopped */ } }
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
}

try {
  await mkdir(evidenceDir, { recursive: true });
  const serverArgs = ['node_modules/vite/bin/vite.js', ...(mode === 'preview' ? ['preview'] : []), '--host', '127.0.0.1', '--port', '7100', '--strictPort'];
  server = spawn(process.execPath, serverArgs, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let serverLog = '';
  server.stdout.on('data', (chunk) => { serverLog += chunk; });
  server.stderr.on('data', (chunk) => { serverLog += chunk; });
  let listening = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Vite exited before validation: ${serverLog}`);
    try { const response = await fetch(base); if (response.ok) { listening = true; break; } } catch { /* wait for startup */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  check('local validation server starts on requested host and port', listening, listening ? base : serverLog);
  if (!listening) throw new Error('No local validation server.');

  browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await desktop.newPage();
  watch(page, 'desktop');
  await page.goto(base, { waitUntil: 'networkidle' });
  await ready(page, 'atlas');
  check('atlas renders all real systems', await page.evaluate(() => window.__OTHER_WORLDS__?.systems === 4865 && window.__OTHER_WORLDS__?.planets === 6473));
  await noOverflow(page, 'desktop atlas');
  await shot(page, 'desktop-atlas');
  performance.atlas = await page.evaluate(() => ({ ...window.__OTHER_WORLDS__, resources: performance.getEntriesByType('resource').length, transferBytes: performance.getEntriesByType('resource').reduce((sum, entry) => sum + (entry.transferSize || 0), 0) }));
  const journeysTrigger = page.getByRole('button', { name: 'Follow a curated journey' });
  await journeysTrigger.click();
  await page.getByRole('dialog').waitFor();
  check('curated journeys expose seven real TRAPPIST-1 stops', await page.locator('.journey-list article').first().locator('.journey-stops button').count() === 7);
  await page.keyboard.press('Shift+Tab');
  check('curated journey dialog contains reverse keyboard focus', await page.evaluate(() => Boolean(document.querySelector('.journeys-panel')?.contains(document.activeElement))));
  await shot(page, 'desktop-journeys');
  await page.keyboard.press('Escape');
  check('closing journeys restores trigger focus', await journeysTrigger.evaluate((element) => document.activeElement === element));

  await page.getByLabel('Search planets or host stars').fill('TRAPPIST-1 e');
  await page.locator('.search-results button').filter({ hasText: 'TRAPPIST-1 e' }).first().click();
  await ready(page, 'system');
  check('search selects the real planetary system', await page.evaluate(() => window.__OTHER_WORLDS__?.planet === 'TRAPPIST-1 e'));
  check('system URL is shareable', page.url().includes('planet=TRAPPIST-1+e') && page.url().includes('view=system'), page.url());
  check('all seven TRAPPIST-1 worlds have DOM alternatives', await page.locator('.sibling-rail button').count() === 7);
  await shot(page, 'desktop-system');

  await page.getByRole('button', { name: 'Approach TRAPPIST-1 e' }).click();
  await ready(page, 'planet');
  await shot(page, 'desktop-planet');
  performance.planet = await page.evaluate(() => ({ ...window.__OTHER_WORLDS__ }));
  await page.getByRole('button', { name: 'Inspect the evidence' }).click();
  await page.getByRole('dialog').waitFor();
  check('measured evidence names its NASA source fields', await page.getByText('NASA pscomppars.pl_rade', { exact: true }).isVisible());
  check('source uncertainty is displayed without false precision', await page.getByText('0.92 (+0.013 / -0.012) R⊕', { exact: true }).isVisible());
  check('per-parameter publication link is actionable', await page.getByRole('link', { name: 'Agol et al. 2021' }).first().getAttribute('href') === 'https://ui.adsabs.harvard.edu/abs/2021PSJ.....2....1A/abstract');
  const { readFile } = await import('node:fs/promises');
  const jsonDownloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Raw JSON' }).click();
  const jsonDownload = await jsonDownloadEvent;
  const exportedJson = JSON.parse(await readFile(await jsonDownload.path(), 'utf8'));
  check('raw JSON download reproduces source values and provenance', jsonDownload.suggestedFilename() === 'trappist-1-e-raw.json' && exportedJson.row.pl_rade === 0.92 && exportedJson.row.pl_radeerr1 === 0.013 && Boolean(exportedJson.baseSnapshot.query));
  const csvDownloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Raw CSV' }).click();
  const csvDownload = await csvDownloadEvent;
  const exportedCsv = await readFile(await csvDownload.path(), 'utf8');
  check('raw CSV download retains measurement and uncertainty fields', exportedCsv.includes('pl_radeerr1') && exportedCsv.includes('0.92'));
  await page.locator('.evidence-panel').evaluate((element) => { element.scrollTop = 0; });
  await shot(page, 'desktop-evidence');
  await page.getByRole('button', { name: /^DERIVED/ }).click();
  check('derived evidence exposes calculation', await page.getByText('g = 9.80665 × pl_bmasse / pl_rade²', { exact: true }).isVisible());
  await page.getByRole('button', { name: /^IMAGINED/ }).click();
  check('imagined evidence disclaims observation', await page.getByText('Artistic reconstruction. No observed surface map or cloud pattern is implied.', { exact: true }).isVisible());
  await page.keyboard.press('Escape');
  check('evidence closes with Escape', await page.getByRole('dialog').count() === 0);

  await page.locator('.planet-actions').getByRole('button', { name: 'Share this view' }).click();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  check('share copies the exact current URL', clipboard === page.url(), { clipboard, current: page.url() });
  const canvas = page.locator('.scene-canvas canvas');
  await canvas.hover({ position: { x: 1040, y: 420 } });
  await page.mouse.move(1040, 420);
  await page.mouse.down();
  await page.mouse.move(1110, 455, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  check('camera interaction updates useful URL state', /az=/.test(page.url()) && /el=/.test(page.url()), page.url());
  const sharedUrl = page.url();
  await page.reload({ waitUntil: 'networkidle' });
  await ready(page, 'planet');
  check('deep link reopens the same world and camera', page.url() === sharedUrl && await page.evaluate(() => window.__OTHER_WORLDS__?.planet === 'TRAPPIST-1 e'));

  await page.getByRole('button', { name: 'Back to the system' }).click();
  await ready(page, 'system');
  await page.getByRole('button', { name: 'Back to the observed sky' }).click();
  await ready(page, 'atlas');
  await page.getByRole('button', { name: 'Rocky', exact: true }).click();
  check('filter produces a bounded real result set', await page.locator('.search-results li').count() > 0);
  await page.getByLabel('Search planets or host stars').fill('no-such-world-000');
  check('empty search has a working recovery state', await page.getByText('No worlds match this view.').isVisible());
  await page.getByRole('button', { name: 'Clear search and filters' }).click();
  check('empty-state recovery clears search', await page.getByLabel('Search planets or host stars').inputValue() === '');
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const phone = await mobile.newPage();
  watch(phone, 'mobile');
  await phone.goto(base, { waitUntil: 'networkidle' });
  await ready(phone, 'atlas');
  await noOverflow(phone, 'mobile atlas');
  await shot(phone, 'mobile-atlas');
  await phone.getByLabel('Search planets or host stars').fill('K2-18 b');
  await phone.locator('.search-results button').filter({ hasText: 'K2-18 b' }).first().click();
  await ready(phone, 'system');
  await noOverflow(phone, 'mobile system');
  await phone.getByRole('button', { name: 'Approach K2-18 b' }).click();
  await ready(phone, 'planet');
  await noOverflow(phone, 'mobile planet');
  check('mobile uses a non-terrain atmospheric treatment for K2-18 b', await phone.getByText(/Illustrative atmosphere · seed/).isVisible());
  await shot(phone, 'mobile-planet');
  const backPosition = await phone.getByRole('button', { name: 'Back to the system' }).evaluate((element) => ({ top: element.getBoundingClientRect().top, position: getComputedStyle(element).position }));
  check('mobile back navigation stays above the portrait metadata', backPosition.position === 'fixed' && backPosition.top >= 70 && backPosition.top < 150, backPosition);
  const touchTarget = await phone.getByRole('button', { name: 'Inspect the evidence' }).evaluate((element) => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height }));
  check('primary mobile action meets 44px touch target', touchTarget.height >= 44 && touchTarget.width >= 44, touchTarget);
  await phone.getByRole('button', { name: 'Inspect the evidence' }).click();
  await phone.getByRole('dialog').waitFor();
  await noOverflow(phone, 'mobile evidence');
  await shot(phone, 'mobile-evidence');
  await mobile.close();

  for (const width of [768, 1024]) {
    const responsive = await browser.newContext({ viewport: { width, height: 900 } });
    const responsivePage = await responsive.newPage();
    watch(responsivePage, `responsive-${width}`);
    await responsivePage.goto(base, { waitUntil: 'networkidle' });
    await ready(responsivePage, 'atlas');
    await noOverflow(responsivePage, `${width}px atlas`);
    check(`${width}px search remains usable`, await responsivePage.getByLabel('Search planets or host stars').isVisible());
    await shot(responsivePage, `responsive-${width}-atlas`);
    await responsive.close();
  }

  const reduced = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const quiet = await reduced.newPage();
  watch(quiet, 'reduced-motion');
  await quiet.goto(`${base}/?planet=HD+189733+b&view=planet&az=0&el=0.08`, { waitUntil: 'networkidle' });
  await ready(quiet, 'planet');
  check('gas giant receives bands, never solid terrain', await quiet.getByText(/Illustrative atmosphere · seed/).isVisible());
  check('reduced-motion removes CSS animation', await quiet.locator('.world-intro').evaluate((element) => getComputedStyle(element).animationName === 'none'));
  await shot(quiet, 'desktop-gas-giant-reduced-motion');
  await reduced.close();

  const fallbackContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await fallbackContext.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (String(type).includes('webgl')) return null;
      return original.call(this, type, ...args);
    };
  });
  const fallbackPage = await fallbackContext.newPage();
  await fallbackPage.goto(`${base}/?planet=TRAPPIST-1+e&view=planet&az=0&el=0.08`, { waitUntil: 'networkidle' });
  await fallbackPage.getByTestId('static-scene').waitFor();
  check('no-WebGL fallback renders a still reconstruction', await fallbackPage.getByTestId('static-scene').isVisible());
  check('fallback explains the active rendering mode', await fallbackPage.getByText(/3D is unavailable/).isVisible());
  await fallbackPage.getByRole('button', { name: 'Inspect the evidence' }).click();
  check('fallback retains evidence inspection', await fallbackPage.getByRole('dialog').isVisible());
  await fallbackPage.keyboard.press('Escape');
  await shot(fallbackPage, 'desktop-static-fallback');
  await fallbackContext.close();

  const errorContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const errorPage = await errorContext.newPage();
  await errorPage.route('**/data/pscomppars.json', (route) => route.abort());
  await errorPage.goto(base, { waitUntil: 'networkidle' });
  check('catalogue failure shows an explicit error state', await errorPage.getByText('The atlas could not be opened.').isVisible());
  await errorPage.unroute('**/data/pscomppars.json');
  await errorPage.getByRole('button', { name: 'Try the snapshot again' }).click();
  await ready(errorPage, 'atlas');
  check('data-error retry recovers the complete atlas', await errorPage.evaluate(() => window.__OTHER_WORLDS__?.planets === 6473));
  await errorContext.close();

  check('zero uncaught page errors', pageErrors.length === 0, pageErrors);
  check('zero console errors in normal journeys', consoleErrors.length === 0, consoleErrors);
  check('zero failed HTTP responses', failedResponses.length === 0, failedResponses);
} catch (error) {
  check('browser validation completed without exception', false, error instanceof Error ? error.stack : String(error));
} finally {
  if (browser) await browser.close();
  await stopServer(server);
  let stopped = false;
  try { await fetch(base, { signal: AbortSignal.timeout(1200) }); } catch { stopped = true; }
  check('local validation server and descendants stopped', stopped);
  const report = {
    validatedAt: new Date().toISOString(),
    mode,
    baseUrl: base,
    checks,
    consoleErrors,
    pageErrors,
    failedResponses,
    performance,
    screenshots: (await import('node:fs/promises')).readdir(evidenceDir).then((files) => files.filter((file) => file.endsWith('.png')).sort()),
    passed: checks.every((item) => item.pass),
  };
  report.screenshots = await report.screenshots;
  await writeFile(path.join(evidenceDir, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Browser report: ${report.passed ? 'PASS' : 'FAIL'} (${checks.filter((item) => item.pass).length}/${checks.length} checks)`);
  if (!report.passed) process.exitCode = 1;
}
