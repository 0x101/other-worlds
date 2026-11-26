import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const roundArgument = process.argv.find((argument) => argument.startsWith('--round='));
const round = roundArgument?.split('=')[1];
if (!round || !/^round-[a-z0-9-]+$/.test(round)) throw new Error('Use --round=round-1, --round=round-2, or another safe round name.');
const root = process.cwd();
const output = path.join(root, 'evidence', round);
const base = 'http://127.0.0.1:7100';
const worlds = ['TRAPPIST-1 e', '55 Cnc e', 'Kepler-10 b', 'HD 189733 b', 'K2-18 b', 'KIC 10001893 b'];
const mobileWorlds = new Set(['TRAPPIST-1 e', 'HD 189733 b']);
const report = { round, capturedAt: new Date().toISOString(), baseUrl: base, frames: [], consoleErrors: [], pageErrors: [], failedResponses: [], serverStopped: false };
let server;
let browser;

try {
  await mkdir(output, { recursive: true });
  server = await preview({ root, preview: { host: '127.0.0.1', port: 7100, strictPort: true }, logLevel: 'silent' });
  browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('console', (message) => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => report.pageErrors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) report.failedResponses.push({ status: response.status(), url: response.url() }); });

  const capture = async (name, url, viewport) => {
    await page.setViewportSize(viewport);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__OTHER_WORLDS__?.ready, { timeout: 30_000 });
    await page.waitForTimeout(2300);
    await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true, animations: 'disabled' });
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, height: innerHeight, scrollHeight: document.documentElement.scrollHeight }));
    const metrics = await page.evaluate(() => ({ ...window.__OTHER_WORLDS__ }));
    report.frames.push({ name, url, viewport, dimensions, metrics });
    console.log(`CAPTURE ${name} ${viewport.width}×${viewport.height}`);
  };

  await capture('atlas-desktop', base, { width: 1440, height: 960 });
  await capture('atlas-mobile', base, { width: 375, height: 812 });
  for (const world of worlds) {
    const slug = world.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const url = `${base}/?planet=${encodeURIComponent(world)}&view=planet&az=0&el=0.08`;
    await capture(`${slug}-desktop`, url, { width: 1440, height: 960 });
    if (mobileWorlds.has(world)) await capture(`${slug}-mobile`, url, { width: 375, height: 812 });
  }
  await context.close();
} catch (error) {
  report.exception = error instanceof Error ? error.stack : String(error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
  try { await fetch(base, { signal: AbortSignal.timeout(1000) }); } catch { report.serverStopped = true; }
  report.passed = !report.exception && report.serverStopped && report.consoleErrors.length === 0 && report.pageErrors.length === 0 && report.failedResponses.length === 0;
  await writeFile(path.join(output, 'manifest.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Reference capture: ${report.passed ? 'PASS' : 'FAIL'} (${report.frames.length} frames)`);
  if (!report.passed) process.exitCode = 1;
}
