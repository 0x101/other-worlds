import type { JourneyState, PlanetRow, Provenance, ShareTemplate } from '../types';
import { orbitalFingerprint, type OrbitalFingerprint } from './fingerprint';
import { derivedGravity, formatValue, generateWorld, seededRandom } from './world';
import { journeySearch } from './urlState';
import { safeFilename } from './exports';

export const SHARE_TEMPLATE_SPECS = {
  portrait: { label: 'Portrait', width: 1800, height: 2250, description: 'Artwork first, with one essential fact.' },
  'field-note': { label: 'Field Note', width: 2400, height: 1800, description: 'An editorial plate of evidence and context.' },
  'orbital-study': { label: 'Orbital Study', width: 2200, height: 2200, description: 'A derived fingerprint of the real system.' },
} as const;

export interface ShareFact { label: string; value: string; status: 'MEASURED' | 'DERIVED' }

export function shareFacts(planet: PlanetRow): ShareFact[] {
  const gravity = derivedGravity(planet);
  const facts: (ShareFact | null)[] = [
    planet.pl_orbper === null ? null : { label: 'LOCAL YEAR', value: planet.pl_orbper < 2 ? formatValue(planet.pl_orbper * 24, 'Earth hours', 1) : formatValue(planet.pl_orbper, 'days'), status: planet.pl_orbper < 2 ? 'DERIVED' : 'MEASURED' },
    planet.pl_rade === null ? null : { label: 'RADIUS', value: formatValue(planet.pl_rade, 'R⊕'), status: 'MEASURED' },
    gravity === null ? null : { label: 'SURFACE GRAVITY', value: `${formatValue(gravity / 9.80665, '× Earth')}`, status: 'DERIVED' },
    planet.pl_insol === null ? null : { label: 'STARLIGHT', value: formatValue(planet.pl_insol, '× Earth'), status: 'MEASURED' },
    planet.pl_eqt === null ? null : { label: 'EQUILIBRIUM TEMPERATURE', value: formatValue(planet.pl_eqt, 'K', 0), status: 'MEASURED' },
    planet.sy_dist === null ? null : { label: 'DISTANCE FROM EARTH', value: formatValue(planet.sy_dist, 'pc'), status: 'MEASURED' },
  ];
  return facts.filter((fact): fact is ShareFact => fact !== null);
}

export function factsForTemplate(planet: PlanetRow, template: ShareTemplate): ShareFact[] {
  const facts = shareFacts(planet);
  if (template === 'portrait') return facts.slice(0, 1);
  if (template === 'field-note') return facts.slice(0, 4);
  return [];
}

export interface OrbitalSibling {
  name: string;
  selected: boolean;
  period: string | null;
  eccentricity: string | null;
  radius: string | null;
}

export function orbitalStudyModel(planet: PlanetRow, siblings: PlanetRow[]) {
  const ordered = [...siblings].sort((a, b) => {
    if (a.pl_orbper === null && b.pl_orbper !== null) return 1;
    if (a.pl_orbper !== null && b.pl_orbper === null) return -1;
    if (a.pl_orbper !== null && b.pl_orbper !== null && a.pl_orbper !== b.pl_orbper) return a.pl_orbper - b.pl_orbper;
    return a.pl_name.localeCompare(b.pl_name);
  });
  const rows: OrbitalSibling[] = ordered.map((sibling) => ({
    name: sibling.pl_name,
    selected: sibling.pl_name === planet.pl_name,
    period: sibling.pl_orbper === null ? null : formatValue(sibling.pl_orbper, 'days'),
    eccentricity: sibling.pl_orbeccen === null ? null : formatValue(sibling.pl_orbeccen),
    radius: sibling.pl_rade === null ? null : formatValue(sibling.pl_rade, 'R⊕'),
  }));
  return {
    fingerprint: orbitalFingerprint(siblings),
    rows,
    visibleRows: rows.slice(0, 8),
    hiddenRowCount: Math.max(0, rows.length - 8),
    hostFacts: [
      planet.st_teff === null ? null : { label: 'HOST TEMPERATURE', value: formatValue(planet.st_teff, 'K', 0) },
      planet.st_rad === null ? null : { label: 'HOST RADIUS', value: formatValue(planet.st_rad, 'R☉') },
      planet.st_mass === null ? null : { label: 'HOST MASS', value: formatValue(planet.st_mass, 'M☉') },
      planet.sy_dist === null ? null : { label: 'SYSTEM DISTANCE', value: formatValue(planet.sy_dist, 'pc') },
    ].filter((fact): fact is { label: string; value: string } => fact !== null),
  };
}

export function exactShareUrl(journey: JourneyState, template: ShareTemplate, currentHref: string): string {
  const url = new URL(currentHref);
  url.search = journeySearch({ ...journey, shareTemplate: template, evidenceOpen: false });
  url.hash = '';
  return url.toString();
}

export function shareFilename(planet: PlanetRow, template: ShareTemplate): string {
  return `${safeFilename(planet.pl_name)}-${template}.png`;
}

function wrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number, maxLines = 4): number {
  const words = text.split(/\s+/);
  let line = '';
  let row = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > width && line) {
      context.fillText(line, x, y + row * lineHeight);
      line = word;
      row += 1;
      if (row >= maxLines - 1) break;
    } else line = candidate;
  }
  if (row < maxLines) context.fillText(line, x, y + row * lineHeight);
  return y + (row + 1) * lineHeight;
}

function drawWorldArt(planet: PlanetRow, camera: JourneyState['camera'], size: number): HTMLCanvasElement {
  const art = document.createElement('canvas');
  art.width = size;
  art.height = size;
  const context = art.getContext('2d');
  if (!context) throw new Error('A 2D canvas is required to compose the share image.');
  const world = generateWorld(planet);
  const random = seededRandom(world.seed);
  const cx = size * 0.5;
  const cy = size * 0.5;
  const radius = size * 0.37;
  context.save();
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.clip();
  const base = context.createRadialGradient(cx - radius * 0.38, cy - radius * 0.35, radius * 0.05, cx, cy, radius * 1.12);
  base.addColorStop(0, world.palette[2]);
  base.addColorStop(0.48, world.palette[1]);
  base.addColorStop(1, world.palette[0]);
  context.fillStyle = base;
  context.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  if (world.surface === 'terrain') {
    for (let index = 0; index < 190; index += 1) {
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * radius;
      const x = cx + Math.cos(angle) * distance;
      const y = cy + Math.sin(angle) * distance;
      const patch = radius * (0.025 + random() * 0.14);
      context.beginPath();
      for (let point = 0; point < 7; point += 1) {
        const theta = point / 7 * Math.PI * 2;
        const jitter = patch * (0.55 + random() * 0.65);
        const px = x + Math.cos(theta) * jitter * 1.6;
        const py = y + Math.sin(theta) * jitter;
        if (point === 0) context.moveTo(px, py); else context.lineTo(px, py);
      }
      context.closePath();
      context.globalAlpha = 0.06 + random() * 0.17;
      context.fillStyle = world.palette[index % 3];
      context.fill();
    }
  } else {
    const bands = world.surface === 'clouds' ? 42 : 66;
    for (let index = 0; index < bands; index += 1) {
      const y = cy - radius + index / bands * radius * 2;
      const amplitude = radius * (0.015 + random() * (world.surface === 'clouds' ? 0.15 : 0.045));
      context.beginPath();
      context.moveTo(cx - radius, y);
      context.bezierCurveTo(cx - radius * 0.45, y + amplitude, cx + radius * 0.3, y - amplitude, cx + radius, y + amplitude * 0.2);
      context.strokeStyle = world.palette[index % 3];
      context.globalAlpha = world.surface === 'clouds' ? 0.08 + random() * 0.18 : 0.12 + random() * 0.2;
      context.lineWidth = radius * (world.surface === 'clouds' ? 0.035 + random() * 0.11 : 0.018 + random() * 0.05);
      context.stroke();
    }
  }
  context.globalAlpha = 1;
  const lightX = cx - Math.sin(camera.azimuth) * radius * 0.6 - radius * 0.35;
  const lightY = cy + Math.sin(camera.elevation) * radius * 0.35 - radius * 0.25;
  const illumination = context.createRadialGradient(lightX, lightY, radius * 0.12, cx, cy, radius * 1.18);
  illumination.addColorStop(0, 'rgba(255,245,220,0.13)');
  illumination.addColorStop(0.42, 'rgba(5,12,13,0.02)');
  illumination.addColorStop(0.72, 'rgba(5,12,13,0.36)');
  illumination.addColorStop(1, 'rgba(5,12,13,0.96)');
  context.fillStyle = illumination;
  context.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  context.restore();
  const halo = context.createRadialGradient(cx, cy, radius * 0.94, cx, cy, radius * 1.09);
  halo.addColorStop(0, 'rgba(0,0,0,0)');
  halo.addColorStop(0.72, world.atmosphereColor);
  halo.addColorStop(0.78, 'rgba(0,0,0,0)');
  context.globalAlpha = world.atmosphereStrength * 0.42;
  context.fillStyle = halo;
  context.fillRect(0, 0, size, size);
  context.globalAlpha = 1;
  return art;
}

function drawFingerprint(context: CanvasRenderingContext2D, fingerprint: OrbitalFingerprint, planets: PlanetRow[], x: number, y: number, size: number, ink = '#d9d8ca'): void {
  context.save();
  context.translate(x, y);
  context.scale(size / 220, size / 220);
  context.strokeStyle = '#8d9b91';
  context.fillStyle = ink;
  context.globalAlpha = 0.52;
  context.lineWidth = 0.75;
  context.beginPath(); context.arc(110, 110, 104, 0, Math.PI * 2); context.stroke();
  for (const orbit of fingerprint.orbits) {
    const squash = orbit.eccentricity === null ? 1 : 1 - orbit.eccentricity * 0.42;
    context.save();
    context.translate(110, 110);
    context.rotate(orbit.rotation * Math.PI / 180);
    context.setLineDash(orbit.eccentricity === null ? [2, 5] : []);
    context.globalAlpha = orbit.eccentricity === null ? 0.24 : 0.5;
    context.beginPath(); context.ellipse(0, 0, orbit.radius, orbit.radius * squash, 0, 0, Math.PI * 2); context.stroke();
    context.restore();
  }
  context.setLineDash([]);
  for (const marker of fingerprint.markers) {
    const planet = planets.find((item) => item.pl_name === marker.planet) ?? planets[0];
    const world = generateWorld(planet);
    const orbit = fingerprint.orbits.find((item) => item.planet === marker.planet);
    const squash = orbit?.eccentricity == null ? 1 : 1 - orbit.eccentricity * 0.42;
    const angle = marker.angle * Math.PI / 180;
    const rotation = (orbit?.rotation ?? 0) * Math.PI / 180;
    const localX = Math.cos(angle) * (marker.orbitRadius ?? 104);
    const localY = Math.sin(angle) * (marker.orbitRadius ?? 104) * squash;
    const px = 110 + localX * Math.cos(rotation) - localY * Math.sin(rotation);
    const py = 110 + localX * Math.sin(rotation) + localY * Math.cos(rotation);
    context.globalAlpha = 1;
    context.fillStyle = world.palette[2];
    context.strokeStyle = world.palette[2];
    context.beginPath(); context.arc(px, py, marker.radius ?? 2.4, 0, Math.PI * 2);
    if (marker.radius !== null) context.fill(); else context.stroke();
    if (marker.orbitRadius === null) {
      const tickAngle = marker.lane / Math.max(1, fingerprint.worldCount) * Math.PI * 2;
      context.strokeStyle = ink;
      context.globalAlpha = 0.5;
      context.beginPath();
      context.moveTo(110 + Math.cos(tickAngle) * 98, 110 + Math.sin(tickAngle) * 98);
      context.lineTo(110 + Math.cos(tickAngle) * 104, 110 + Math.sin(tickAngle) * 104);
      context.stroke();
    }
  }
  context.globalAlpha = 1;
  context.fillStyle = ink;
  context.beginPath(); context.arc(110, 110, 4, 0, Math.PI * 2); context.fill();
  context.restore();
}

async function qrImage(url: string, size: number, light = '#dedccd'): Promise<HTMLImageElement> {
  const QRCode = await import('qrcode');
  const source = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 2, width: size, color: { dark: '#101817', light } });
  const image = new Image();
  image.src = source;
  await image.decode();
  return image;
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The PNG encoder returned no image.')), 'image/png'));
}

function line(context: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string): void {
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke();
}

function header(context: CanvasRenderingContext2D, width: number, label: string, dark = true): void {
  context.fillStyle = dark ? '#d8b787' : '#7d4e2e';
  context.font = '500 22px Manrope';
  context.fillText('OTHER WORLDS / A PORTRAIT WITH PROVENANCE', 104, 112);
  context.textAlign = 'right';
  context.fillStyle = dark ? '#9aa79e' : '#46534e';
  context.fillText(label.toUpperCase(), width - 104, 112);
  context.textAlign = 'left';
}

interface CreateShareImageOptions {
  planet: PlanetRow;
  siblings: PlanetRow[];
  journey: JourneyState;
  provenance: Provenance;
  template: ShareTemplate;
  reopenUrl: string;
}

export async function createShareImage(options: CreateShareImageOptions): Promise<Blob> {
  await document.fonts.ready;
  if (options.template === 'field-note') return createFieldNote(options);
  if (options.template === 'orbital-study') return createOrbitalStudy(options);
  return createPortrait(options);
}

async function createPortrait({ planet, journey, provenance, template, reopenUrl }: CreateShareImageOptions): Promise<Blob> {
  const spec = SHARE_TEMPLATE_SPECS[template];
  const canvas = document.createElement('canvas');
  canvas.width = spec.width; canvas.height = spec.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The share canvas could not be created.');
  const world = generateWorld(planet);
  const fact = factsForTemplate(planet, 'portrait')[0];
  context.fillStyle = '#0d1514'; context.fillRect(0, 0, canvas.width, canvas.height);
  const ambient = context.createRadialGradient(900, 850, 10, 900, 850, 1100);
  ambient.addColorStop(0, `${world.palette[0]}cc`); ambient.addColorStop(1, '#0d151400');
  context.fillStyle = ambient; context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#34413b'; context.strokeRect(52, 52, canvas.width - 104, canvas.height - 104);
  header(context, canvas.width, 'Portrait');
  context.drawImage(drawWorldArt(planet, journey.camera, 1500), 150, 130);
  context.fillStyle = '#9aa79e'; context.font = '400 25px Manrope'; context.fillText(`${planet.hostname} system`, 120, 1570);
  context.fillStyle = '#e4e2d5'; context.font = '400 126px "Instrument Serif"'; context.fillText(planet.pl_name, 120, 1700, 1560);
  context.fillStyle = '#d8b787'; context.font = '500 20px Manrope'; context.fillText(`${world.kindLabel.toUpperCase()} / DERIVED CLASS`, 120, 1760);
  if (fact) {
    line(context, 120, 1840, 1390, 1840, '#34413b');
    context.fillStyle = fact.status === 'DERIVED' ? '#d8b787' : '#9aa79e'; context.font = '500 19px Manrope'; context.fillText(`${fact.label} / ${fact.status}`, 120, 1890);
    context.fillStyle = '#e4e2d5'; context.font = '400 54px "Instrument Serif"'; context.fillText(fact.value, 120, 1960, 1260);
  }
  context.fillStyle = '#9aa79e'; context.font = '400 18px Manrope';
  wrappedText(context, 'Imagined artwork informed by archive evidence—not an observed surface image.', 120, 2050, 1230, 30, 2);
  context.drawImage(await qrImage(reopenUrl, 180), 1500, 1880, 180, 180);
  context.fillStyle = '#9aa79e'; context.font = '500 15px Manrope'; context.fillText('REOPEN EXACT VIEW', 1500, 1850);
  context.fillStyle = '#9aa79e'; context.font = '400 15px Manrope';
  context.fillText(`NASA Exoplanet Archive pscomppars · snapshot ${provenance.fetchedAt} · Other Worlds art, seed ${world.seed}`, 104, 2180, 1590);
  return canvasBlob(canvas);
}

async function createFieldNote({ planet, journey, provenance, template, reopenUrl }: CreateShareImageOptions): Promise<Blob> {
  const spec = SHARE_TEMPLATE_SPECS[template];
  const canvas = document.createElement('canvas');
  canvas.width = spec.width; canvas.height = spec.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The share canvas could not be created.');
  const world = generateWorld(planet);
  const facts = factsForTemplate(planet, 'field-note');
  context.fillStyle = '#e5e2d5'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#17211f'; context.fillRect(0, 0, 1190, 1800);
  context.strokeStyle = '#7f897f'; context.strokeRect(52, 52, canvas.width - 104, canvas.height - 104);
  header(context, canvas.width, 'Field Note / scientific plate');
  context.drawImage(drawWorldArt(planet, journey.camera, 1080), 60, 190);
  context.fillStyle = '#9aa79e'; context.font = '400 18px Manrope';
  wrappedText(context, 'IMAGINED / Deterministic artistic reconstruction. Illumination follows the saved camera; terrain, clouds, and atmospheric detail are not observations.', 110, 1300, 970, 31, 4);
  context.fillStyle = '#46534e'; context.font = '400 24px Manrope'; context.fillText(`${planet.hostname} system`, 1290, 260);
  context.fillStyle = '#17211f'; context.font = '400 104px "Instrument Serif"'; context.fillText(planet.pl_name, 1290, 380, 960);
  context.fillStyle = '#7d4e2e'; context.font = '500 19px Manrope'; context.fillText(`${world.kindLabel.toUpperCase()} / DERIVED CLASS`, 1290, 440);
  line(context, 1290, 490, 2250, 490, '#a9aea3');
  facts.forEach((fact, index) => {
    const y = 580 + index * 190;
    line(context, 1290, y - 42, 2250, y - 42, '#b7baaf');
    context.fillStyle = fact.status === 'DERIVED' ? '#7d4e2e' : '#46534e'; context.font = '500 18px Manrope'; context.fillText(`${fact.label} / ${fact.status}`, 1290, y);
    context.fillStyle = '#17211f'; context.font = '400 46px "Instrument Serif"'; context.fillText(fact.value, 1290, y + 66, 930);
  });
  if (!facts.length) {
    context.fillStyle = '#17211f'; context.font = '400 42px "Instrument Serif"'; context.fillText('Much remains unknown.', 1290, 610);
    context.fillStyle = '#46534e'; context.font = '400 20px Manrope'; wrappedText(context, 'This catalogue row has no usable numeric facts for this plate. Missing values are not replaced with zeros or inventions.', 1290, 680, 900, 34, 4);
  }
  context.fillStyle = '#46534e'; context.font = '400 17px Manrope';
  wrappedText(context, `MEASURED / Archive-reported values from NASA pscomppars. DERIVED / Transparent calculations from those values. IMAGINED / The portrait and its surface or atmospheric detail. Discovery: ${planet.discoverymethod ?? 'not reported'}${planet.disc_year === null ? '' : `, ${planet.disc_year}`}.`, 1290, 1370, 900, 30, 5);
  context.fillStyle = '#17211f'; context.font = '500 16px Manrope'; context.fillText('REOPEN THIS EXACT FIELD NOTE', 110, 1540);
  context.fillStyle = '#c6cec3'; context.font = '400 16px Manrope'; context.fillText(reopenUrl, 110, 1580, 1720);
  context.drawImage(await qrImage(reopenUrl, 190, '#e5e2d5'), 2070, 1480, 190, 190);
  context.fillStyle = '#9aa79e'; context.font = '400 14px Manrope';
  context.fillText(`Data: NASA Exoplanet Archive pscomppars · snapshot ${provenance.fetchedAt}`, 110, 1715, 1000);
  context.fillStyle = '#46534e';
  context.fillText(`Art: Other Worlds · deterministic seed ${world.seed}`, 1290, 1715, 960);
  return canvasBlob(canvas);
}

async function createOrbitalStudy({ planet, siblings, provenance, template, reopenUrl }: CreateShareImageOptions): Promise<Blob> {
  const spec = SHARE_TEMPLATE_SPECS[template];
  const canvas = document.createElement('canvas');
  canvas.width = spec.width; canvas.height = spec.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The share canvas could not be created.');
  const model = orbitalStudyModel(planet, siblings);
  context.fillStyle = '#101817'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#34413b'; context.strokeRect(52, 52, canvas.width - 104, canvas.height - 104);
  header(context, canvas.width, 'Orbital Study / derived art');
  context.fillStyle = '#9aa79e'; context.font = '400 22px Manrope'; context.fillText(`${model.fingerprint.worldCount} CATALOGUED ${model.fingerprint.worldCount === 1 ? 'WORLD' : 'WORLDS'} / ${model.fingerprint.knownPeriodCount} KNOWN PERIODS`, 110, 225);
  context.fillStyle = '#e4e2d5'; context.font = '400 112px "Instrument Serif"'; context.fillText(planet.hostname, 110, 345, 1960);
  drawFingerprint(context, model.fingerprint, siblings, 80, 410, 930);
  context.fillStyle = '#d8b787'; context.font = '500 17px Manrope'; context.fillText(`ORBITAL FINGERPRINT / SIGNATURE ${model.fingerprint.signature}`, 120, 1390);
  context.fillStyle = '#9aa79e'; context.font = '400 18px Manrope';
  wrappedText(context, 'DERIVED ART, NOT AN EPHEMERIS. Orbit radii use log-period position within this system’s known range. Ellipse squash encodes reported eccentricity; dashed orbits mean eccentricity is unknown. Hollow markers mean radius is unknown. Worlds without a period have no invented orbit and appear on the outer lane. Phase and rotation are deterministic artistic choices; visual scales are compressed.', 120, 1460, 850, 32, 9);
  context.fillStyle = '#d8b787'; context.font = '500 18px Manrope'; context.fillText('HOST SYSTEM / MEASURED WHERE SHOWN', 1150, 440);
  model.hostFacts.forEach((fact, index) => {
    const x = 1150 + (index % 2) * 470;
    const y = 510 + Math.floor(index / 2) * 120;
    context.fillStyle = '#9aa79e'; context.font = '400 14px Manrope'; context.fillText(fact.label, x, y);
    context.fillStyle = '#e4e2d5'; context.font = '400 31px "Instrument Serif"'; context.fillText(fact.value, x, y + 45, 440);
  });
  const tableTop = 800;
  context.fillStyle = '#d8b787'; context.font = '500 18px Manrope'; context.fillText('CATALOGUED SIBLINGS / UNKNOWN FIELDS OMITTED', 1150, tableTop - 50);
  model.visibleRows.forEach((row, index) => {
    const y = tableTop + index * 105;
    line(context, 1150, y - 36, 2070, y - 36, '#34413b');
    context.fillStyle = row.selected ? '#d8b787' : '#e4e2d5'; context.font = '400 27px "Instrument Serif"'; context.fillText(`${row.selected ? '● ' : ''}${row.name}`, 1150, y, 860);
    const details = [row.period ? `P ${row.period}` : null, row.eccentricity ? `e ${row.eccentricity}` : null, row.radius ? `R ${row.radius}` : null].filter(Boolean).join('  ·  ');
    context.fillStyle = '#9aa79e'; context.font = '400 15px Manrope'; context.fillText(details, 1150, y + 32, 900);
  });
  if (model.hiddenRowCount) {
    context.fillStyle = '#9aa79e'; context.font = '400 16px Manrope'; context.fillText(`+ ${model.hiddenRowCount} more catalogued ${model.hiddenRowCount === 1 ? 'world' : 'worlds'} in this system`, 1150, tableTop + model.visibleRows.length * 105);
  }
  if (!model.rows.length) {
    context.fillStyle = '#9aa79e'; context.font = '400 20px Manrope'; context.fillText('No sibling rows are available in this snapshot.', 1150, tableTop);
  }
  context.fillStyle = '#9aa79e'; context.font = '400 17px Manrope'; context.fillText(`Selected world: ${planet.pl_name}. All names and shown values come from the bundled archive snapshot.`, 1150, 1770, 900);
  context.fillStyle = '#e4e2d5'; context.font = '500 16px Manrope'; context.fillText('REOPEN THIS EXACT ORBITAL STUDY', 110, 1900);
  context.fillStyle = '#9aa79e'; context.font = '400 16px Manrope'; context.fillText(reopenUrl, 110, 1940, 1650);
  context.drawImage(await qrImage(reopenUrl, 190), 1870, 1810, 190, 190);
  context.fillStyle = '#9aa79e'; context.font = '400 14px Manrope'; context.fillText(`Data: NASA Exoplanet Archive pscomppars · snapshot ${provenance.fetchedAt} · Derived art: Other Worlds`, 104, 2120, 1990);
  return canvasBlob(canvas);
}
