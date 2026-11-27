import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';
import { json2satrec, propagate } from 'satellite.js';
import { GeoMoon, Rotation_EQJ_ECL, RotateVector } from 'astronomy-engine';
import * as THREE from 'three';

const root = process.cwd();
const mode = process.argv.includes('--preview') ? 'preview' : 'development';
const evidenceDir = path.join(root, 'evidence');
const base = 'http://127.0.0.1:7100';
const gaia = JSON.parse(await readFile(path.join(root, 'src/data/gaia-neighbourhood.json'), 'utf8'));
const iss = JSON.parse(await readFile(path.join(root, 'src/data/iss-expedition.json'), 'utf8'));
const moon = JSON.parse(await readFile(path.join(root, 'src/data/moon-expedition.json'), 'utf8'));
const issSatrec = json2satrec(iss.elements);
const issVectorAt = (epoch) => {
  const result = propagate(issSatrec, new Date(epoch));
  if (!result) throw new Error(`ISS browser reference propagation failed at ${epoch}.`);
  return [result.position.x, result.position.y, result.position.z];
};
const moonVectorAt = (epoch) => {
  const eqj = GeoMoon(new Date(epoch));
  const ecliptic = RotateVector(Rotation_EQJ_ECL(), eqj);
  return { eqj: [eqj.x, eqj.y, eqj.z], ecliptic: [ecliptic.x, ecliptic.y, ecliptic.z] };
};
const projectionCamera = new THREE.PerspectiveCamera(46, 1440 / 960, 0.1, 500);
projectionCamera.position.set(0, 7, 44);
projectionCamera.lookAt(0, 0, 0);
projectionCamera.updateMatrixWorld();
const gaiaClickTarget = gaia.stars.map((star) => {
  const ra = star.ra * Math.PI / 180;
  const dec = star.dec * Math.PI / 180;
  const radius = 5 + Math.log10(star.r_med_geo + 1) * 13;
  const point = new THREE.Vector3(radius * Math.cos(dec) * Math.cos(ra), radius * Math.sin(dec), radius * Math.cos(dec) * Math.sin(ra)).project(projectionCamera);
  return { sourceId: star.source_id, x: (point.x + 1) * 720, y: (1 - point.y) * 480, z: point.z };
}).find((point) => point.x > 800 && point.x < 1320 && point.y > 160 && point.y < 680 && point.z > -1 && point.z < 1);
if (!gaiaClickTarget) throw new Error('No unobscured Gaia source could be projected for browser picking.');
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
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (label === 'no-webgl' && message.text() === 'THREE.WebGLRenderer: Error creating WebGL context.') return;
    consoleErrors.push({ page: label, text: message.text() });
  });
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
  await ready(page, 'earth');
  check('cold start opens Earth with a You Are Here frame', await page.locator('.earth-copy').isVisible() && await page.getByText(/You are here \/ Earth/i).isVisible());
  await noOverflow(page, 'desktop Earth');
  await shot(page, 'desktop-earth');
  performance.earth = await page.evaluate(() => ({ ...window.__OTHER_WORLDS__, resources: performance.getEntriesByType('resource').length, transferBytes: performance.getEntriesByType('resource').reduce((sum, entry) => sum + (entry.transferSize || 0), 0) }));
  check('Earth opens without an unsolicited live-style satellite tracker', await page.locator('.iss-expedition').count() === 0 && !page.url().includes('iss='));
  const cameraBeforeIss = await page.evaluate(() => ({ ...window.__OTHER_WORLDS__.camera }));
  await page.evaluate(() => { window.__issValidationCanvas = document.querySelector('.scene-canvas canvas'); });
  await page.getByRole('button', { name: 'Meet the ISS' }).click();
  await page.waitForFunction((epoch) => document.querySelector('.scene-canvas')?.dataset.issEpoch === epoch, iss.selection.defaultEpoch);
  await ready(page, 'earth');
  check('ISS expedition opens at the preserved source epoch with its actual source credit', await page.locator('.iss-selected-time time').getAttribute('datetime') === iss.selection.defaultEpoch && page.url().includes(`iss=${encodeURIComponent(iss.selection.defaultEpoch)}`) && await page.getByRole('link', { name: 'CT / OMM' }).getAttribute('href') === iss.source.requestUrl);
  check('ISS marker matches independently propagated TEME kilometres without resetting canvas or camera', await page.evaluate(({ expected, before }) => {
    const actual = document.querySelector('.scene-canvas')?.dataset.issTemeKm?.split(',').map(Number) ?? [];
    const camera = window.__OTHER_WORLDS__.camera;
    return expected.length === actual.length && expected.every((value, index) => Math.abs(value - actual[index]) < 0.0000001) && window.__issValidationCanvas === document.querySelector('.scene-canvas canvas') && Object.keys(before).every((key) => Math.abs(camera[key] - before[key]) < 0.000001);
  }, { expected: issVectorAt(iss.selection.defaultEpoch), before: cameraBeforeIss }));
  await page.getByRole('button', { name: 'Next 10 minutes' }).click();
  await page.waitForFunction(() => document.querySelector('.scene-canvas')?.dataset.issEpoch === '2026-11-27T09:39:25.185Z');
  await ready(page, 'earth');
  check('ISS ten-minute step updates exact-link state and derived TEME geometry in the existing scene', page.url().includes('iss=2026-11-27T09%3A39%3A25.185Z') && await page.evaluate(({ expected, before }) => {
    const actual = document.querySelector('.scene-canvas')?.dataset.issTemeKm?.split(',').map(Number) ?? [];
    const camera = window.__OTHER_WORLDS__.camera;
    return expected.every((value, index) => Math.abs(value - actual[index]) < 0.0000001) && window.__issValidationCanvas === document.querySelector('.scene-canvas canvas') && Object.keys(before).every((key) => Math.abs(camera[key] - before[key]) < 0.000001);
  }, { expected: issVectorAt('2026-11-27T09:39:25.185Z'), before: cameraBeforeIss }));
  await noOverflow(page, 'desktop ISS expedition');
  await shot(page, 'desktop-earth-iss');
  const selectedIssUrl = page.url();
  await page.reload({ waitUntil: 'networkidle' });
  await ready(page, 'earth');
  check('ISS exact-link reload restores the open expedition and selected millisecond', page.url() === selectedIssUrl && await page.locator('.iss-selected-time time').getAttribute('datetime') === '2026-11-27T09:39:25.185Z' && await page.evaluate(() => window.__OTHER_WORLDS__?.issEpoch === '2026-11-27T09:39:25.185Z'));
  await page.getByText('Orbit, staleness & scale', { exact: true }).click();
  check('ISS source audit exposes exact epoch, historical age, no live refresh, and no invented accuracy bound', await page.getByText('2026-11-27T09:29:25.185696Z', { exact: true }).isVisible() && await page.getByText(/9 h 52 min old when preserved/).isVisible() && await page.getByText(/not an accuracy guarantee/).isVisible() && await page.getByText(/No live position, runtime refresh/).isVisible());
  await shot(page, 'desktop-earth-iss-method');
  await page.getByText('Orbit, staleness & scale', { exact: true }).click();
  performance.iss = await page.evaluate(() => ({ ...window.__OTHER_WORLDS__ }));
  await page.getByRole('button', { name: 'Reset to ISS source epoch' }).click();
  await page.waitForFunction((epoch) => document.querySelector('.scene-canvas')?.dataset.issEpoch === epoch, iss.selection.defaultEpoch);
  check('ISS reset restores the source epoch and disables redundant reset', await page.getByRole('button', { name: 'Reset to ISS source epoch' }).isDisabled() && page.url().includes(`iss=${encodeURIComponent(iss.selection.defaultEpoch)}`));
  await page.getByRole('button', { name: 'Close ISS expedition' }).click();
  check('closing the ISS expedition removes its marker and URL state without leaving Earth', await page.locator('.iss-expedition').count() === 0 && !page.url().includes('iss=') && await page.evaluate(() => window.__OTHER_WORLDS__?.view === 'earth' && !document.querySelector('.scene-canvas')?.dataset.issEpoch));

  const cameraBeforeMoon = await page.evaluate(() => ({ ...window.__OTHER_WORLDS__.camera }));
  await page.evaluate(() => { window.__moonValidationCanvas = document.querySelector('.scene-canvas canvas'); });
  await page.getByRole('button', { name: 'Meet the Moon' }).click();
  await page.waitForFunction((epoch) => document.querySelector('.scene-canvas')?.dataset.moonEpoch === epoch, moon.selection.defaultEpoch);
  await ready(page, 'earth');
  check('Moon expedition opens at its preserved reference epoch with pinned ephemeris credit', await page.locator('.moon-expedition .iss-selected-time time').getAttribute('datetime') === moon.selection.defaultEpoch && page.url().includes(`moon=${encodeURIComponent(moon.selection.defaultEpoch)}`) && !page.url().includes('iss=') && await page.getByRole('link', { name: 'AE / 2.1.19' }).getAttribute('href') === moon.source.url);
  check('Moon marker matches independent EQJ/ECL vectors without resetting canvas or camera', await page.evaluate(({ expected, before }) => {
    const container = document.querySelector('.scene-canvas');
    const eqj = container?.dataset.moonEqjAu?.split(',').map(Number) ?? [];
    const ecliptic = container?.dataset.moonEclAu?.split(',').map(Number) ?? [];
    const camera = window.__OTHER_WORLDS__.camera;
    return expected.eqj.every((value, index) => Math.abs(value - eqj[index]) < 0.000000000001) && expected.ecliptic.every((value, index) => Math.abs(value - ecliptic[index]) < 0.000000000001) && window.__moonValidationCanvas === document.querySelector('.scene-canvas canvas') && Object.keys(before).every((key) => Math.abs(camera[key] - before[key]) < 0.000001);
  }, { expected: moonVectorAt(moon.selection.defaultEpoch), before: cameraBeforeMoon }));
  await page.getByRole('button', { name: 'Next 3 hours' }).click();
  await page.waitForFunction(() => document.querySelector('.scene-canvas')?.dataset.moonEpoch === '2026-12-18T03:00:00.000Z');
  await ready(page, 'earth');
  check('Moon three-hour step updates exact-link state and derived geometry in the existing scene', page.url().includes('moon=2026-12-18T03%3A00%3A00.000Z') && await page.evaluate(({ expected, before }) => {
    const actual = document.querySelector('.scene-canvas')?.dataset.moonEqjAu?.split(',').map(Number) ?? [];
    const camera = window.__OTHER_WORLDS__.camera;
    return expected.eqj.every((value, index) => Math.abs(value - actual[index]) < 0.000000000001) && window.__moonValidationCanvas === document.querySelector('.scene-canvas canvas') && Object.keys(before).every((key) => Math.abs(camera[key] - before[key]) < 0.000001);
  }, { expected: moonVectorAt('2026-12-18T03:00:00.000Z'), before: cameraBeforeMoon }));
  await noOverflow(page, 'desktop Moon expedition');
  await shot(page, 'desktop-earth-moon');
  const selectedMoonUrl = page.url();
  await page.reload({ waitUntil: 'networkidle' });
  await ready(page, 'earth');
  check('Moon exact-link reload restores the open expedition and selected instant', page.url() === selectedMoonUrl && await page.locator('.moon-expedition .iss-selected-time time').getAttribute('datetime') === '2026-12-18T03:00:00.000Z' && await page.evaluate(() => window.__OTHER_WORLDS__?.moonEpoch === '2026-12-18T03:00:00.000Z'));
  await page.getByText('Ephemeris, time & scale', { exact: true }).click();
  check('Moon source audit exposes reference epoch, time scales, display compression, and scientific limits', await page.getByText('2026-12-18T00:00:00.000Z', { exact: true }).isVisible() && await page.getByText(/UT1 ≈ UTC/).isVisible() && await page.getByText(/not an accuracy guarantee/).isVisible() && await page.getByText(/not an observed surface portrait or calculated phase/).isVisible());
  await shot(page, 'desktop-earth-moon-method');
  await page.getByText('Ephemeris, time & scale', { exact: true }).click();
  performance.moon = await page.evaluate(() => ({ ...window.__OTHER_WORLDS__ }));
  await page.getByRole('button', { name: 'Reset to Moon reference epoch' }).click();
  await page.waitForFunction((epoch) => document.querySelector('.scene-canvas')?.dataset.moonEpoch === epoch, moon.selection.defaultEpoch);
  check('Moon reset restores the reference epoch and disables redundant reset', await page.getByRole('button', { name: 'Reset to Moon reference epoch' }).isDisabled() && page.url().includes(`moon=${encodeURIComponent(moon.selection.defaultEpoch)}`));
  await page.getByRole('button', { name: 'Close Moon expedition' }).click();
  check('closing the Moon expedition removes its marker and URL state without leaving Earth', await page.locator('.moon-expedition').count() === 0 && !page.url().includes('moon=') && await page.evaluate(() => window.__OTHER_WORLDS__?.view === 'earth' && !document.querySelector('.scene-canvas')?.dataset.moonEpoch));

  await page.getByRole('button', { name: 'Leave Earth' }).click();
  await ready(page, 'solar');
  check('Solar System opens eight modelled planets at the preserved explicit epoch', await page.locator('.solar-worlds li').count() === 8 && await page.locator('.solar-time time').getAttribute('datetime') === '2026-11-26T00:00:00.000Z');
  check('Solar System credits the pinned ephemeris rather than the exoplanet snapshot', await page.getByRole('link', { name: 'AE / 2.1.19' }).getAttribute('href') === 'https://github.com/cosinekitty/astronomy/tree/master/source/js');
  await noOverflow(page, 'desktop Solar System');
  await shot(page, 'desktop-solar');

  await page.evaluate(() => { window.__solarValidationCanvas = document.querySelector('.scene-canvas canvas'); });
  const cameraBeforeEpoch = await page.evaluate(() => ({ ...window.__OTHER_WORLDS__.camera }));
  await page.getByRole('button', { name: 'Next day', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.scene-canvas')?.dataset.solarEpoch === '2026-11-27T00:00:00.000Z');
  await ready(page, 'solar');
  check('next-day derivation updates the existing scene and shareable URL without moving the camera', page.url().includes('epoch=2026-11-27T00%3A00%3A00.000Z') && await page.evaluate((before) => {
    const current = window.__OTHER_WORLDS__;
    return window.__solarValidationCanvas === document.querySelector('.scene-canvas canvas') && Object.keys(before).every((key) => Math.abs(current.camera[key] - before[key]) < 0.000001);
  }, cameraBeforeEpoch));

  const beforePlayback = await page.locator('.solar-time time').getAttribute('datetime');
  await page.getByRole('button', { name: 'Play model time' }).click();
  await page.waitForFunction((start) => Date.parse(document.querySelector('.solar-time time').dateTime) >= Date.parse(start) + 43_200_000, beforePlayback, { timeout: 8000 });
  check('playback advances explicit model time at the declared rate', await page.getByRole('button', { name: 'Pause model time' }).getAttribute('aria-pressed') === 'true' && await page.getByText('Model time playing · not a live clock.', { exact: true }).isVisible());
  await shot(page, 'desktop-solar-time');
  await page.getByRole('button', { name: 'Pause model time' }).click();
  const pausedEpoch = await page.locator('.solar-time time').getAttribute('datetime');
  await page.waitForTimeout(650);
  check('pause holds the selected epoch', await page.locator('.solar-time time').getAttribute('datetime') === pausedEpoch && await page.getByText('Paused · date choices select 00:00 UTC.', { exact: true }).isVisible());

  await page.getByLabel('Choose UTC date').fill('2027-01-02');
  await page.waitForFunction(() => document.querySelector('.scene-canvas')?.dataset.solarEpoch === '2027-01-02T00:00:00.000Z');
  const selectedSolarUrl = page.url();
  await page.reload({ waitUntil: 'networkidle' });
  await ready(page, 'solar');
  check('selected Solar System epoch survives an exact-link reload at 00:00 UTC', page.url() === selectedSolarUrl && await page.locator('.solar-time time').getAttribute('datetime') === '2027-01-02T00:00:00.000Z' && await page.locator('.solar-time time').getByText('02 JAN 2027 · 00:00 UTC', { exact: true }).isVisible());

  await page.mouse.move(1040, 420);
  await page.mouse.down();
  await page.mouse.move(1110, 455, { steps: 8 });
  await page.mouse.up();
  await page.evaluate(() => { window.__solarSettleReference = null; });
  await page.waitForFunction(() => {
    const current = window.__OTHER_WORLDS__?.camera;
    if (!current) return false;
    const previous = window.__solarSettleReference;
    window.__solarSettleReference = { ...current };
    return previous && Object.keys(previous).every((key) => Math.abs(current[key] - previous[key]) < 0.0001);
  }, null, { polling: 2100, timeout: 15000 });
  await ready(page, 'solar');
  const draggedSolarCamera = await page.evaluate(() => ({ ...window.__OTHER_WORLDS__.camera }));
  await page.getByRole('button', { name: 'Next day', exact: true }).click();
  await ready(page, 'solar');
  const cameraAfterEpoch = await page.evaluate(() => ({ ...window.__OTHER_WORLDS__.camera }));
  check('camera orbit remains coherent across later epoch changes', Object.keys(draggedSolarCamera).every((key) => Math.abs(cameraAfterEpoch[key] - draggedSolarCamera[key]) < 0.01), { before: draggedSolarCamera, after: cameraAfterEpoch });
  await shot(page, 'desktop-solar-selected');
  await page.getByRole('button', { name: 'Reset to reference epoch' }).click();
  await page.waitForFunction(() => document.querySelector('.scene-canvas')?.dataset.solarEpoch === '2026-11-26T00:00:00.000Z');
  check('reset restores the preserved epoch and removes redundant URL time state', !page.url().includes('epoch=') && await page.getByRole('button', { name: 'Reset to reference epoch' }).isDisabled());
  await page.getByLabel('Choose UTC date').fill('1999-12-31');
  check('out-of-window date input preserves the selected epoch and visible draft without a page error', await page.getByText('Use 2000-01-01 through 2100-01-01 UTC · epoch unchanged.', { exact: true }).isVisible() && await page.locator('.solar-time time').getAttribute('datetime') === '2026-11-26T00:00:00.000Z' && await page.getByLabel('Choose UTC date').getAttribute('aria-invalid') === 'true' && await page.getByLabel('Choose UTC date').inputValue() === '1999-12-31');
  await page.getByLabel('Choose UTC date').fill('2026-11-26');
  check('valid date recovery clears the input error even when the epoch was unchanged', await page.getByLabel('Choose UTC date').getAttribute('aria-invalid') === 'false' && await page.getByLabel('Choose UTC date').inputValue() === '2026-11-26' && await page.getByText('Paused · date choices select 00:00 UTC.', { exact: true }).isVisible());
  performance.solar = await page.evaluate(() => ({ ...window.__OTHER_WORLDS__ }));

  await page.getByRole('button', { name: 'Travel to nearby suns' }).click();
  await ready(page, 'neighbourhood');
  check('Gaia neighbourhood discloses ICRS epoch, posterior distances, compression, and incompleteness', await page.getByText('Gaia DR3 direction · geometric posterior distance · logarithmic display · not a complete census', { exact: true }).isVisible() && await page.getByText('Gaia DR3 neighbourhood / J2016.0', { exact: true }).isVisible());
  await noOverflow(page, 'desktop Gaia neighbourhood');
  await shot(page, 'desktop-neighbourhood');
  await page.mouse.click(gaiaClickTarget.x, gaiaClickTarget.y);
  await page.waitForTimeout(200);
  check('WebGL picking opens the exact Gaia source inspector', await page.locator('.gaia-inspector').isVisible() && await page.locator('.gaia-inspector').getByText(`Gaia DR3 ${gaiaClickTarget.sourceId}`, { exact: true }).isVisible(), gaiaClickTarget);
  if (await page.locator('.gaia-inspector').isVisible()) await page.getByRole('button', { name: 'Close Gaia source inspector' }).click();
  await page.getByText('Catalogue & distance method', { exact: true }).click();
  const gaiaSelector = page.getByLabel('Inspect by Gaia source ID');
  check('Gaia audit exposes all 384 exact string source IDs plus an empty choice', await gaiaSelector.locator('option').count() === 385);
  const desktopGaiaMethodGeometry = await page.evaluate(() => {
    const panel = document.querySelector('.gaia-method > div').getBoundingClientRect();
    const course = document.querySelector('.neighbourhood-copy .primary-button').getBoundingClientRect();
    return { panelTop: panel.top, panelBottom: panel.bottom, panelLeft: panel.left, panelRight: panel.right, courseRight: course.right, viewportWidth: innerWidth, viewportHeight: innerHeight };
  });
  check('desktop Gaia method stays inside the viewport and clears the course action', desktopGaiaMethodGeometry.panelTop >= 0 && desktopGaiaMethodGeometry.panelBottom <= desktopGaiaMethodGeometry.viewportHeight && desktopGaiaMethodGeometry.panelRight <= desktopGaiaMethodGeometry.viewportWidth && desktopGaiaMethodGeometry.panelLeft >= desktopGaiaMethodGeometry.courseRight, desktopGaiaMethodGeometry);
  await shot(page, 'desktop-gaia-method');
  await gaiaSelector.selectOption('4472832130942575872');
  check('source-ID inspection retains published geometric distance and parallax uncertainty', await page.locator('.gaia-inspector').isVisible() && await page.locator('.gaia-inspector').getByText('Gaia DR3 4472832130942575872', { exact: true }).isVisible() && await page.locator('.gaia-inspector').getByText('546.976 ± 0.040 mas', { exact: true }).isVisible() && await page.locator('.gaia-inspector').getByText('1.8280–1.8282', { exact: true }).isVisible());
  check('source selection closes the method panel without losing the inspector', !await page.locator('.gaia-method').evaluate((element) => element.open) && await page.locator('.gaia-inspector').isVisible());
  await shot(page, 'desktop-gaia-source');
  await page.getByRole('button', { name: 'Close Gaia source inspector' }).click();
  performance.neighbourhood = await page.evaluate(() => ({ ...window.__OTHER_WORLDS__ }));

  await page.getByRole('button', { name: 'Plot course for TRAPPIST-1' }).click();
  await ready(page, 'system');
  check('golden path arrives at the real TRAPPIST-1 system', await page.evaluate(() => window.__OTHER_WORLDS__?.planet === 'TRAPPIST-1 e'));
  check('golden-path system back action returns to nearby suns', await page.getByRole('button', { name: 'Back to nearby suns' }).isVisible());
  await page.getByRole('button', { name: 'Approach TRAPPIST-1 e' }).click();
  await ready(page, 'planet');
  await page.getByRole('button', { name: 'Look back toward home' }).click();
  await ready(page, 'lookback');
  check('look-back preserves the selected host and exact route state', page.url().includes('planet=TRAPPIST-1+e') && page.url().includes('view=lookback') && await page.locator('.home-marker').isVisible());
  check('look-back discloses a schematic rather than observed view', await page.getByText('Schematic look-back · archive direction · distance compressed · not an observed view', { exact: true }).isVisible());
  await shot(page, 'desktop-lookback');
  performance.lookback = await page.evaluate(() => ({ ...window.__OTHER_WORLDS__ }));

  await page.getByRole('button', { name: 'Resume TRAPPIST-1 e' }).click();
  await ready(page, 'planet');
  check('resume returns to the same world portrait', await page.evaluate(() => window.__OTHER_WORLDS__?.planet === 'TRAPPIST-1 e'));
  await page.getByRole('button', { name: 'Look back toward home' }).click();
  await ready(page, 'lookback');
  await page.getByRole('button', { name: 'Return to Earth', exact: true }).click();
  await ready(page, 'earth');
  check('return home clears the remote destination without reloading the renderer', await page.evaluate(() => window.__OTHER_WORLDS__?.planet === null));
  await page.getByRole('button', { name: 'Explore the exoplanet atlas' }).click();
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

  const canvas = page.locator('.scene-canvas canvas');
  await canvas.hover({ position: { x: 1040, y: 420 } });
  await page.mouse.move(1040, 420);
  await page.mouse.down();
  await page.mouse.move(1110, 455, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  check('direct camera manipulation remains on the world canvas and updates URL state', /az=/.test(page.url()) && /el=/.test(page.url()), page.url());
  const sharedUrl = page.url();
  await page.reload({ waitUntil: 'networkidle' });
  await ready(page, 'planet');
  check('deep link reopens the same world and camera', page.url() === sharedUrl && await page.evaluate(() => window.__OTHER_WORLDS__?.planet === 'TRAPPIST-1 e'));

  const worldUrl = page.url();
  check('Studio is absent as a destination and no manual designer controls remain', await page.getByRole('button', { name: 'Studio', exact: true }).count() === 0 && await page.getByRole('slider').count() === 0);
  const shareTrigger = page.locator('.planet-actions').getByRole('button', { name: 'Share this world' });
  await page.evaluate(() => {
    window.__otherWorldsToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback) { callback(null); };
  });
  await shareTrigger.click();
  await page.getByText('PNG composition was interrupted.').waitFor();
  check('Share PNG failure is explicit and recoverable', await page.getByRole('button', { name: 'Try this template again' }).isVisible() && page.url().includes('share=portrait'));
  await page.evaluate(() => {
    HTMLCanvasElement.prototype.toBlob = window.__otherWorldsToBlob;
    delete window.__otherWorldsToBlob;
  });
  await page.getByRole('button', { name: 'Try this template again' }).click();
  await page.locator('.share-preview img').waitFor({ timeout: 45_000 });
  check('Share opens as a contextual dialog with a live Portrait preview', await page.getByRole('dialog').isVisible() && await page.locator('.share-preview').getAttribute('data-template') === 'portrait');
  check('Share offers exactly three finished templates and no customization sliders', await page.locator('.share-template-picker > button').count() === 3 && await page.getByRole('slider').count() === 0);
  await shot(page, 'desktop-share-portrait');

  const pngSizes = { portrait: [1800, 2250], 'field-note': [2400, 1800], 'orbital-study': [2200, 2200] };
  let exactPortrait = '';
  for (const template of ['portrait', 'field-note', 'orbital-study']) {
    if (template !== 'portrait') {
      await page.locator('.share-template-picker > button').filter({ hasText: template === 'field-note' ? 'Field Note' : 'Orbital Study' }).click();
      await page.locator(`.share-preview[data-template="${template}"] img`).waitFor({ timeout: 45_000 });
      await shot(page, `desktop-share-${template}`);
    }
    await page.locator('.share-actions').getByRole('button', { name: 'Copy exact link' }).click();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    check(`${template}: copy exact link preserves world, camera, and template`, clipboard === page.url() && clipboard.includes(`share=${template}`) && clipboard.includes('az=') && clipboard.includes('el='), { clipboard, current: page.url() });
    if (template === 'portrait') exactPortrait = clipboard;
    const downloadEvent = page.waitForEvent('download', { timeout: 45_000 });
    await page.getByRole('button', { name: 'Download PNG' }).click();
    const download = await downloadEvent;
    const exportPath = path.join(evidenceDir, `share-trappist-1-e-${template}.png`);
    await download.saveAs(exportPath);
    const bytes = await readFile(exportPath);
    const [width, height] = pngSizes[template];
    check(`${template}: actual high-resolution PNG download has correct dimensions and content`, download.suggestedFilename() === `trappist-1-e-${template}.png` && bytes.subarray(1, 4).toString() === 'PNG' && bytes.readUInt32BE(16) === width && bytes.readUInt32BE(20) === height && bytes.length > 50_000, { bytes: bytes.length, filename: download.suggestedFilename(), width, height });
  }

  await page.keyboard.press('Escape');
  check('Share closes with Escape back to the same world and camera', await page.getByRole('dialog').count() === 0 && page.url() === worldUrl, { before: worldUrl, after: page.url() });
  check('closing Share restores trigger focus', await shareTrigger.evaluate((element) => document.activeElement === element));
  await page.goto(exactPortrait, { waitUntil: 'networkidle' });
  await ready(page, 'planet');
  await page.locator('.share-preview[data-template="portrait"] img').waitFor({ timeout: 45_000 });
  check('exact copied link reopens Share with its selected template', page.url() === exactPortrait && await page.locator('.share-template-picker > button').filter({ hasText: 'Portrait' }).getAttribute('aria-pressed') === 'true');
  await page.keyboard.press('Escape');
  await page.goto(`${base}/?planet=TRAPPIST-1+e&view=planet&mode=studio&az=0&el=0.08&exp=0.85&comp=left&crop=square`, { waitUntil: 'networkidle' });
  await ready(page, 'planet');
  await page.locator('.share-preview[data-template="portrait"] img').waitFor({ timeout: 45_000 });
  check('legacy Studio deep link migrates to Portrait with no designer controls', await page.getByRole('dialog').isVisible() && await page.getByRole('slider').count() === 0 && await page.getByRole('button', { name: 'Studio', exact: true }).count() === 0);
  await page.locator('.share-actions').getByRole('button', { name: 'Copy exact link' }).click();
  const migratedLink = await page.evaluate(() => navigator.clipboard.readText());
  check('migrated exact link removes all legacy Studio parameters', migratedLink.includes('share=portrait') && !/mode=studio|exp=|comp=|crop=/.test(migratedLink), migratedLink);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Back to the system' }).click();
  await ready(page, 'system');
  check('system view contains a seven-world orbital fingerprint', await page.locator('.orbital-fingerprint svg').isVisible() && await page.locator('.orbital-fingerprint [data-planet]').count() === 7);
  await page.getByRole('button', { name: 'Back to nearby suns' }).click();
  await ready(page, 'neighbourhood');
  check('originless legacy world links return to the golden journey', page.url().includes('view=neighbourhood'));
  await page.getByRole('button', { name: 'Open the full exoplanet atlas' }).click();
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
  await ready(phone, 'earth');
  await noOverflow(phone, 'mobile Earth');
  check('mobile opens on Earth with its primary departure action', await phone.getByRole('button', { name: 'Leave Earth' }).isVisible());
  await shot(phone, 'mobile-earth');
  await phone.getByRole('button', { name: 'Meet the ISS' }).click();
  await phone.waitForFunction((epoch) => document.querySelector('.scene-canvas')?.dataset.issEpoch === epoch, iss.selection.defaultEpoch);
  await phone.getByRole('button', { name: 'Next 10 minutes' }).click();
  await phone.waitForFunction(() => document.querySelector('.scene-canvas')?.dataset.issEpoch === '2026-11-27T09:39:25.185Z');
  await noOverflow(phone, 'mobile ISS expedition');
  const mobileIssGeometry = await phone.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
    };
    return {
      panel: box('.iss-expedition'),
      narrative: box('.earth-copy'),
      primary: box('.earth-copy .primary-button'),
      credit: box('.earth-credit'),
      controls: [...document.querySelectorAll('.iss-time-actions button, .iss-heading .icon-button')].map((element) => {
        const rect = element.getBoundingClientRect();
        return { label: element.getAttribute('aria-label'), top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
      }),
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
    };
  });
  check('mobile ISS panel and controls stay bounded and clear the Earth narrative, departure action, and credit', mobileIssGeometry.panel.top >= Math.max(mobileIssGeometry.narrative.bottom, mobileIssGeometry.primary.bottom) && mobileIssGeometry.panel.bottom <= mobileIssGeometry.credit.top && mobileIssGeometry.panel.left >= 0 && mobileIssGeometry.panel.right <= mobileIssGeometry.viewportWidth && mobileIssGeometry.panel.bottom <= mobileIssGeometry.viewportHeight && mobileIssGeometry.controls.every((control) => control.top >= mobileIssGeometry.panel.top && control.bottom <= mobileIssGeometry.panel.bottom && control.left >= 0 && control.right <= mobileIssGeometry.viewportWidth && control.width >= 44 && control.height >= 44), mobileIssGeometry);
  check('mobile ISS manual step preserves the exact selected instant', await phone.locator('.iss-selected-time time').getAttribute('datetime') === '2026-11-27T09:39:25.185Z' && phone.url().includes('iss=2026-11-27T09%3A39%3A25.185Z'));
  await shot(phone, 'mobile-earth-iss');
  await phone.getByRole('button', { name: 'Close ISS expedition' }).click();
  check('mobile ISS closes cleanly before leaving Earth', await phone.locator('.iss-expedition').count() === 0 && !phone.url().includes('iss='));
  await phone.getByRole('button', { name: 'Meet the Moon' }).click();
  await phone.waitForFunction((epoch) => document.querySelector('.scene-canvas')?.dataset.moonEpoch === epoch, moon.selection.defaultEpoch);
  await phone.getByRole('button', { name: 'Next 3 hours' }).click();
  await phone.waitForFunction(() => document.querySelector('.scene-canvas')?.dataset.moonEpoch === '2026-12-18T03:00:00.000Z');
  await noOverflow(phone, 'mobile Moon expedition');
  const mobileMoonGeometry = await phone.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
    };
    return {
      panel: box('.moon-expedition'),
      narrative: box('.earth-copy'),
      primary: box('.earth-copy .primary-button'),
      credit: box('.earth-credit'),
      controls: [...document.querySelectorAll('.moon-expedition .iss-time-actions button, .moon-expedition .iss-heading .icon-button')].map((element) => {
        const rect = element.getBoundingClientRect();
        return { label: element.getAttribute('aria-label'), top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
      }),
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
    };
  });
  check('mobile Moon panel and controls stay bounded and clear the Earth narrative, departure action, and credit', mobileMoonGeometry.panel.top >= Math.max(mobileMoonGeometry.narrative.bottom, mobileMoonGeometry.primary.bottom) && mobileMoonGeometry.panel.bottom <= mobileMoonGeometry.credit.top && mobileMoonGeometry.panel.left >= 0 && mobileMoonGeometry.panel.right <= mobileMoonGeometry.viewportWidth && mobileMoonGeometry.panel.bottom <= mobileMoonGeometry.viewportHeight && mobileMoonGeometry.controls.every((control) => control.top >= mobileMoonGeometry.panel.top && control.bottom <= mobileMoonGeometry.panel.bottom && control.left >= 0 && control.right <= mobileMoonGeometry.viewportWidth && control.width >= 44 && control.height >= 44), mobileMoonGeometry);
  check('mobile Moon manual step preserves the exact selected instant', await phone.locator('.moon-expedition .iss-selected-time time').getAttribute('datetime') === '2026-12-18T03:00:00.000Z' && phone.url().includes('moon=2026-12-18T03%3A00%3A00.000Z'));
  await shot(phone, 'mobile-earth-moon');
  await phone.getByRole('button', { name: 'Close Moon expedition' }).click();
  check('mobile Moon closes cleanly before leaving Earth', await phone.locator('.moon-expedition').count() === 0 && !phone.url().includes('moon='));
  await phone.getByRole('button', { name: 'Leave Earth' }).click();
  await ready(phone, 'solar');
  await noOverflow(phone, 'mobile Solar System');
  await phone.getByRole('button', { name: 'Next day', exact: true }).click();
  await phone.waitForFunction(() => document.querySelector('.scene-canvas')?.dataset.solarEpoch === '2026-11-27T00:00:00.000Z');
  const mobileSolarGeometry = await phone.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, height: rect.height };
    };
    return { panel: box('.solar-time'), course: box('.solar-copy .primary-button'), worlds: box('.solar-worlds'), next: box('.solar-time-actions button[aria-label="Next day"]'), viewportWidth: innerWidth, viewportHeight: innerHeight };
  });
  check('mobile Solar time controls stay viewport-bounded and clear the course and planet rail', mobileSolarGeometry.panel.top >= mobileSolarGeometry.course.bottom && mobileSolarGeometry.panel.bottom <= mobileSolarGeometry.worlds.top && mobileSolarGeometry.panel.left >= 0 && mobileSolarGeometry.panel.right <= mobileSolarGeometry.viewportWidth && mobileSolarGeometry.panel.bottom <= mobileSolarGeometry.viewportHeight, mobileSolarGeometry);
  check('mobile epoch step preserves a 44px touch target and exact selected time', mobileSolarGeometry.next.height >= 44 && await phone.locator('.solar-time time').getAttribute('datetime') === '2026-11-27T00:00:00.000Z');
  await shot(phone, 'mobile-solar');
  await phone.getByRole('button', { name: 'Travel to nearby suns' }).click();
  await ready(phone, 'neighbourhood');
  await noOverflow(phone, 'mobile Gaia neighbourhood');
  check('mobile Gaia neighbourhood keeps its journey and catalogue controls visible', await phone.getByRole('button', { name: 'Plot course for TRAPPIST-1' }).isVisible() && await phone.getByText('Catalogue & distance method', { exact: true }).isVisible());
  await shot(phone, 'mobile-neighbourhood');
  await phone.getByText('Catalogue & distance method', { exact: true }).click();
  const mobileGaiaMethodGeometry = await phone.evaluate(() => {
    const panel = document.querySelector('.gaia-method > div').getBoundingClientRect();
    const course = document.querySelector('.neighbourhood-copy .primary-button').getBoundingClientRect();
    return { panelTop: panel.top, panelBottom: panel.bottom, panelLeft: panel.left, panelRight: panel.right, courseBottom: course.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight };
  });
  check('mobile Gaia method clears the course action and stays inside the viewport', mobileGaiaMethodGeometry.panelTop >= mobileGaiaMethodGeometry.courseBottom && mobileGaiaMethodGeometry.panelBottom <= mobileGaiaMethodGeometry.viewportHeight && mobileGaiaMethodGeometry.panelLeft >= 0 && mobileGaiaMethodGeometry.panelRight <= mobileGaiaMethodGeometry.viewportWidth, mobileGaiaMethodGeometry);
  await shot(phone, 'mobile-gaia-method');
  await phone.getByRole('button', { name: 'Close catalogue and distance method' }).click();
  check('mobile Gaia method has a working explicit dismissal', !await phone.locator('.gaia-method').evaluate((element) => element.open));
  await phone.getByText('Catalogue & distance method', { exact: true }).click();
  await phone.getByLabel('Inspect by Gaia source ID').selectOption('4472832130942575872');
  check('mobile source selection opens a bounded readable inspector', await phone.locator('.gaia-inspector').isVisible() && await phone.locator('.gaia-inspector').evaluate((element) => { const box = element.getBoundingClientRect(); return box.top >= 0 && box.bottom <= window.innerHeight && box.left >= 0 && box.right <= window.innerWidth; }));
  const mobileGaiaGeometry = await phone.evaluate(() => {
    const inspector = document.querySelector('.gaia-inspector').getBoundingClientRect();
    const course = document.querySelector('.neighbourhood-copy .primary-button').getBoundingClientRect();
    return { inspectorTop: inspector.top, courseBottom: course.bottom };
  });
  check('mobile Gaia inspector does not cover the primary course action', mobileGaiaGeometry.inspectorTop >= mobileGaiaGeometry.courseBottom, mobileGaiaGeometry);
  await shot(phone, 'mobile-gaia-source');
  await phone.getByRole('button', { name: 'Close Gaia source inspector' }).click();
  await phone.goto(base, { waitUntil: 'networkidle' });
  await ready(phone, 'earth');
  await phone.getByRole('button', { name: 'Explore the exoplanet atlas' }).click();
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
  check('mobile preserves look-back and Share actions', await phone.getByRole('button', { name: 'Look back toward home' }).isVisible() && await phone.locator('.planet-actions').getByRole('button', { name: 'Share this world' }).isVisible());
  const mobileActionGeometry = await phone.evaluate(() => {
    const box = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
    };
    return { guide: box('.wonder-panel'), secondary: box('.planet-secondary-actions'), primary: box('.planet-actions > .primary-button') };
  });
  check('mobile secondary actions do not overlap the field guide or primary action', mobileActionGeometry.secondary.top >= mobileActionGeometry.guide.bottom && mobileActionGeometry.primary.top >= mobileActionGeometry.secondary.bottom && mobileActionGeometry.secondary.left >= 0 && mobileActionGeometry.secondary.right <= 375, mobileActionGeometry);
  await phone.locator('.planet-actions').getByRole('button', { name: 'Share this world' }).click();
  await phone.locator('.share-preview[data-template="portrait"] img').waitFor({ timeout: 45_000 });
  await noOverflow(phone, 'mobile Share');
  const mobileDownload = phone.getByRole('button', { name: 'Download PNG' });
  check('mobile Share keeps templates and export tappable without sliders', await mobileDownload.isVisible() && await mobileDownload.evaluate((element) => element.getBoundingClientRect().height >= 44) && await phone.locator('.share-template-picker > button').count() === 3 && await phone.getByRole('slider').count() === 0);
  await shot(phone, 'mobile-share');
  await phone.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('Clipboard blocked for validation')) } }));
  await phone.locator('.share-actions').getByRole('button', { name: 'Copy exact link' }).click();
  check('blocked clipboard selects the exact link for manual recovery', await phone.locator('#share-exact-link').evaluate((element) => document.activeElement === element && element.selectionStart === 0 && element.selectionEnd === element.value.length));
  await phone.locator('.share-header').getByRole('button', { name: 'Close Share' }).click();
  await phone.getByRole('button', { name: 'Inspect the evidence' }).click();
  await phone.getByRole('dialog').waitFor();
  await noOverflow(phone, 'mobile evidence');
  await shot(phone, 'mobile-evidence');
  await mobile.close();

  for (const width of [768, 1024]) {
    const responsive = await browser.newContext({ viewport: { width, height: 900 } });
    const responsivePage = await responsive.newPage();
    watch(responsivePage, `responsive-${width}`);
    await responsivePage.goto(`${base}/?view=atlas`, { waitUntil: 'networkidle' });
    await ready(responsivePage, 'atlas');
    await noOverflow(responsivePage, `${width}px atlas`);
    check(`${width}px search remains usable`, await responsivePage.getByLabel('Search planets or host stars').isVisible());
    await shot(responsivePage, `responsive-${width}-atlas`);
    await responsive.close();
  }

  const reduced = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const quiet = await reduced.newPage();
  watch(quiet, 'reduced-motion');
  await quiet.goto(base, { waitUntil: 'networkidle' });
  await ready(quiet, 'earth');
  await quiet.getByRole('button', { name: 'Meet the ISS' }).click();
  await quiet.waitForFunction((epoch) => document.querySelector('.scene-canvas')?.dataset.issEpoch === epoch, iss.selection.defaultEpoch);
  check('reduced-motion ISS has no playback control or CSS animation', await quiet.getByRole('button', { name: /Play/ }).count() === 0 && await quiet.locator('.iss-expedition').evaluate((element) => getComputedStyle(element).animationName === 'none'));
  await quiet.getByRole('button', { name: 'Next 10 minutes' }).click();
  await quiet.waitForFunction(() => document.querySelector('.scene-canvas')?.dataset.issEpoch === '2026-11-27T09:39:25.185Z');
  check('reduced-motion ISS retains explicit ten-minute stepping', await quiet.locator('.iss-selected-time time').getAttribute('datetime') === '2026-11-27T09:39:25.185Z');
  await shot(quiet, 'desktop-earth-iss-reduced-motion');
  await quiet.getByRole('button', { name: 'Close ISS expedition' }).click();
  await quiet.getByRole('button', { name: 'Meet the Moon' }).click();
  await quiet.waitForFunction((epoch) => document.querySelector('.scene-canvas')?.dataset.moonEpoch === epoch, moon.selection.defaultEpoch);
  check('reduced-motion Moon has no playback control or CSS animation', await quiet.getByRole('button', { name: /Play/ }).count() === 0 && await quiet.locator('.moon-expedition').evaluate((element) => getComputedStyle(element).animationName === 'none'));
  await quiet.getByRole('button', { name: 'Next 3 hours' }).click();
  await quiet.waitForFunction(() => document.querySelector('.scene-canvas')?.dataset.moonEpoch === '2026-12-18T03:00:00.000Z');
  check('reduced-motion Moon retains explicit three-hour stepping', await quiet.locator('.moon-expedition .iss-selected-time time').getAttribute('datetime') === '2026-12-18T03:00:00.000Z');
  await shot(quiet, 'desktop-earth-moon-reduced-motion');
  await quiet.getByRole('button', { name: 'Close Moon expedition' }).click();
  await quiet.getByRole('button', { name: 'Leave Earth' }).click();
  await ready(quiet, 'solar');
  check('reduced-motion disables the journey transition', await quiet.locator('.journey-wipe').evaluate((element) => getComputedStyle(element).display === 'none'));
  check('reduced-motion replaces automatic playback with an explicit explanation', await quiet.getByRole('button', { name: 'Play model time' }).count() === 0 && await quiet.getByText('Reduced motion · use explicit date steps.', { exact: true }).isVisible());
  await quiet.getByRole('button', { name: 'Next day', exact: true }).click();
  await quiet.waitForFunction(() => document.querySelector('.scene-canvas')?.dataset.solarEpoch === '2026-11-27T00:00:00.000Z');
  check('reduced-motion retains deterministic manual epoch stepping', await quiet.locator('.solar-time time').getAttribute('datetime') === '2026-11-27T00:00:00.000Z' && await quiet.locator('.solar-time').evaluate((element) => getComputedStyle(element).animationName === 'none'));
  await shot(quiet, 'desktop-solar-reduced-motion');
  await quiet.getByRole('button', { name: 'Travel to nearby suns' }).click();
  await ready(quiet, 'neighbourhood');
  await noOverflow(quiet, 'reduced-motion Gaia neighbourhood');
  check('reduced-motion retains the complete Gaia scene and source audit', await quiet.locator('.gaia-method').isVisible() && await quiet.getByRole('button', { name: 'Plot course for TRAPPIST-1' }).isVisible());
  await shot(quiet, 'desktop-neighbourhood-reduced-motion');
  await quiet.goto(`${base}/?planet=HD+189733+b&view=planet&az=0&el=0.08`, { waitUntil: 'networkidle' });
  await ready(quiet, 'planet');
  check('gas giant receives bands, never solid terrain', await quiet.getByText(/Illustrative atmosphere · seed/).isVisible());
  check('reduced-motion removes CSS animation', await quiet.locator('.world-intro').evaluate((element) => getComputedStyle(element).animationName === 'none'));
  await shot(quiet, 'desktop-gas-giant-reduced-motion');
  await quiet.locator('.planet-actions').getByRole('button', { name: 'Share this world' }).click();
  await quiet.locator('.share-template-picker > button').filter({ hasText: 'Field Note' }).click();
  await quiet.locator('.share-preview[data-template="field-note"] img').waitFor({ timeout: 45_000 });
  check('reduced-motion Share dialog has no animation', await quiet.locator('.share-dialog').evaluate((element) => getComputedStyle(element).animationName === 'none'));
  const reducedDownloadEvent = quiet.waitForEvent('download', { timeout: 45_000 });
  await quiet.getByRole('button', { name: 'Download PNG' }).click();
  const reducedDownload = await reducedDownloadEvent;
  const reducedBytes = await readFile(await reducedDownload.path());
  check('reduced-motion exports a full-resolution Field Note PNG', reducedBytes.subarray(1, 4).toString() === 'PNG' && reducedBytes.readUInt32BE(16) === 2400 && reducedBytes.readUInt32BE(20) === 1800 && reducedBytes.length > 50_000, { bytes: reducedBytes.length });
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
  watch(fallbackPage, 'no-webgl');
  await fallbackPage.goto(base, { waitUntil: 'networkidle' });
  await fallbackPage.locator('.static-earth').waitFor();
  check('no-WebGL cold start renders a still Earth', await fallbackPage.locator('.app').getAttribute('data-view') === 'earth' && await fallbackPage.locator('.static-earth').isVisible());
  await shot(fallbackPage, 'desktop-static-earth');
  await fallbackPage.getByRole('button', { name: 'Meet the ISS' }).click();
  await fallbackPage.getByTestId('static-iss').waitFor();
  const staticIssBefore = await fallbackPage.locator('[data-testid="static-iss"] [data-iss-marker]').getAttribute('data-teme-km');
  await fallbackPage.getByRole('button', { name: 'Next 10 minutes' }).click();
  await fallbackPage.waitForFunction((before) => document.querySelector('[data-testid="static-iss"] [data-iss-marker]')?.getAttribute('data-teme-km') !== before, staticIssBefore);
  check('no-WebGL ISS manual step updates independently propagated TEME geometry and its exact still label', await fallbackPage.locator('[data-testid="static-iss"] [data-iss-marker]').evaluate((element, expected) => {
    const actual = element.getAttribute('data-teme-km')?.split(',').map(Number) ?? [];
    return expected.length === actual.length && expected.every((value, index) => Math.abs(value - actual[index]) < 0.0000001);
  }, issVectorAt('2026-11-27T09:39:25.185Z')) && (await fallbackPage.getByTestId('static-iss').getAttribute('aria-label'))?.includes('09:39:25.185 UTC') && await fallbackPage.locator('.iss-status').getByText(/Still reconstruction/, { exact: false }).isVisible());
  await noOverflow(fallbackPage, 'no-WebGL ISS expedition');
  await shot(fallbackPage, 'desktop-static-earth-iss');
  await fallbackPage.getByRole('button', { name: 'Close ISS expedition' }).click();
  await fallbackPage.getByRole('button', { name: 'Meet the Moon' }).click();
  await fallbackPage.getByTestId('static-moon').waitFor();
  const staticMoonBefore = await fallbackPage.locator('[data-testid="static-moon"] [data-moon-marker]').getAttribute('data-eqj-au');
  await fallbackPage.getByRole('button', { name: 'Next 3 hours' }).click();
  await fallbackPage.waitForFunction((before) => document.querySelector('[data-testid="static-moon"] [data-moon-marker]')?.getAttribute('data-eqj-au') !== before, staticMoonBefore);
  check('no-WebGL Moon manual step updates independent EQJ/ECL geometry and its exact still label', await fallbackPage.locator('[data-testid="static-moon"] [data-moon-marker]').evaluate((element, expected) => {
    const eqj = element.getAttribute('data-eqj-au')?.split(',').map(Number) ?? [];
    const ecliptic = element.getAttribute('data-ecl-au')?.split(',').map(Number) ?? [];
    return expected.eqj.every((value, index) => Math.abs(value - eqj[index]) < 0.000000000001) && expected.ecliptic.every((value, index) => Math.abs(value - ecliptic[index]) < 0.000000000001);
  }, moonVectorAt('2026-12-18T03:00:00.000Z')) && (await fallbackPage.getByTestId('static-moon').getAttribute('aria-label'))?.includes('18 DEC 2026 · 03:00 UTC') && await fallbackPage.locator('.moon-expedition .iss-status').getByText(/Still reconstruction/, { exact: false }).isVisible());
  await noOverflow(fallbackPage, 'no-WebGL Moon expedition');
  await shot(fallbackPage, 'desktop-static-earth-moon');
  await fallbackPage.getByRole('button', { name: 'Close Moon expedition' }).click();
  await fallbackPage.getByRole('button', { name: 'Leave Earth' }).click();
  await fallbackPage.locator('.static-solar').waitFor();
  const staticSolarCopy = await fallbackPage.locator('.solar-copy p').textContent();
  check('no-WebGL journey reaches an honest still Solar System', await fallbackPage.locator('.app').getAttribute('data-view') === 'solar' && await fallbackPage.locator('.static-solar').isVisible() && staticSolarCopy?.includes('Still view · choose an instant below.') && !staticSolarCopy.includes('Drag to change your viewpoint.'));
  const staticMercuryBefore = await fallbackPage.locator('.static-solar [data-solar-body="Mercury"]').getAttribute('data-eqj-au');
  await fallbackPage.getByRole('button', { name: 'Next day', exact: true }).click();
  check('no-WebGL epoch stepping updates retained EQJ vectors and explicit still caption', await fallbackPage.locator('.static-solar [data-solar-body="Mercury"]').getAttribute('data-eqj-au') !== staticMercuryBefore && (await fallbackPage.locator('.static-solar svg').getAttribute('aria-label')).includes('27 NOV 2026 · 00:00 UTC') && await fallbackPage.locator('.static-solar [data-solar-body="Mercury"]').getAttribute('data-ecl-au') !== null);
  await noOverflow(fallbackPage, 'no-WebGL Solar System');
  await shot(fallbackPage, 'desktop-static-solar');
  await fallbackPage.getByRole('button', { name: 'Travel to nearby suns' }).click();
  await fallbackPage.locator('.static-neighbourhood').waitFor();
  check('no-WebGL Gaia fallback renders all 384 traceable sources', await fallbackPage.locator('.static-neighbourhood .gaia-star').count() === 384 && await fallbackPage.locator('.static-neighbourhood .gaia-star title').first().evaluate((element) => /^Gaia DR3 \d+:/.test(element.textContent ?? '')));
  await noOverflow(fallbackPage, 'no-WebGL Gaia neighbourhood');
  await shot(fallbackPage, 'desktop-static-neighbourhood');
  await fallbackPage.getByText('Catalogue & distance method', { exact: true }).click();
  await fallbackPage.getByLabel('Inspect by Gaia source ID').selectOption('4472832130942575872');
  check('no-WebGL source selector retains the scientific inspector', await fallbackPage.locator('.gaia-inspector').getByText('Gaia DR3 4472832130942575872', { exact: true }).isVisible());
  await fallbackPage.getByRole('button', { name: 'Close Gaia source inspector' }).click();
  await fallbackPage.goto(`${base}/?planet=TRAPPIST-1+e&view=planet&az=0&el=0.08`, { waitUntil: 'networkidle' });
  await fallbackPage.locator('.static-planet').waitFor();
  check('no-WebGL fallback renders a still reconstruction', await fallbackPage.getByTestId('static-scene').isVisible());
  check('fallback explains the active rendering mode', await fallbackPage.getByText(/3D is unavailable/).isVisible());
  await fallbackPage.getByRole('button', { name: 'Inspect the evidence' }).click();
  check('fallback retains evidence inspection', await fallbackPage.getByRole('dialog').isVisible());
  await fallbackPage.keyboard.press('Escape');
  await shot(fallbackPage, 'desktop-static-fallback');
  await fallbackPage.locator('.planet-actions').getByRole('button', { name: 'Share this world' }).click();
  await fallbackPage.locator('.share-template-picker > button').filter({ hasText: 'Orbital Study' }).click();
  await fallbackPage.locator('.share-preview[data-template="orbital-study"] img').waitFor({ timeout: 45_000 });
  const fallbackDownloadEvent = fallbackPage.waitForEvent('download', { timeout: 45_000 });
  await fallbackPage.getByRole('button', { name: 'Download PNG' }).click();
  const fallbackDownload = await fallbackDownloadEvent;
  const fallbackBytes = await readFile(await fallbackDownload.path());
  check('no-WebGL static renderer exports a high-resolution Orbital Study PNG', fallbackBytes.subarray(1, 4).toString() === 'PNG' && fallbackBytes.readUInt32BE(16) === 2200 && fallbackBytes.readUInt32BE(20) === 2200 && fallbackBytes.length > 50_000 && await fallbackPage.getByTestId('static-scene').isVisible(), { bytes: fallbackBytes.length });
  await shot(fallbackPage, 'desktop-static-share');
  await fallbackContext.close();

  const errorContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const errorPage = await errorContext.newPage();
  await errorPage.route('**/data/pscomppars.json', (route) => route.abort());
  await errorPage.goto(base, { waitUntil: 'networkidle' });
  check('catalogue failure shows an explicit error state', await errorPage.getByText('The atlas could not be opened.').isVisible());
  await errorPage.unroute('**/data/pscomppars.json');
  await errorPage.getByRole('button', { name: 'Try the snapshot again' }).click();
  await ready(errorPage, 'earth');
  check('data-error retry recovers the complete snapshot on Earth', await errorPage.evaluate(() => window.__OTHER_WORLDS__?.planets === 6473));
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
