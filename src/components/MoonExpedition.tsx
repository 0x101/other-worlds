import { ArrowUpRight, ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';
import {
  DEFAULT_MOON_EPOCH,
  MOON_EXPEDITION,
  MOON_MAX_EPOCH,
  MOON_MIN_EPOCH,
  formatMoonEpoch,
  formatMoonOffset,
  moonStateAt,
  shiftMoonEpoch,
} from '../lib/moon';

interface MoonExpeditionProps {
  epoch: string;
  staticMode: boolean;
  onEpoch: (epoch: string) => void;
  onClose: () => void;
}

export default function MoonExpedition({ epoch, staticMode, onEpoch, onClose }: MoonExpeditionProps) {
  const state = moonStateAt(epoch);
  return (
    <section className="iss-expedition moon-expedition" aria-label="Moon selected-time geocentric expedition">
      <div className="iss-heading">
        <div><span className="section-label">DERIVED DIRECTION · EARTH’S MOON</span><h2>The <em>Moon.</em></h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close Moon expedition"><X size={15} /></button>
      </div>
      <div className="iss-selected-time"><span>Selected instant · UTC</span><time dateTime={epoch}>{formatMoonEpoch(epoch)}</time></div>
      <div className="iss-time-actions">
        <button className="icon-button" onClick={() => onEpoch(shiftMoonEpoch(epoch, -180))} disabled={epoch === MOON_MIN_EPOCH} aria-label="Previous 3 hours" title="Three hours earlier"><ChevronLeft size={17} /></button>
        <button className="icon-button" onClick={() => onEpoch(shiftMoonEpoch(epoch, 180))} disabled={epoch === MOON_MAX_EPOCH} aria-label="Next 3 hours" title="Three hours later"><ChevronRight size={17} /></button>
        <button className="text-button" onClick={() => onEpoch(DEFAULT_MOON_EPOCH)} disabled={epoch === DEFAULT_MOON_EPOCH} aria-label="Reset to Moon reference epoch"><RotateCcw size={14} />Reference epoch</button>
      </div>
      <p className="iss-status" role="status">{formatMoonOffset(state.offsetMinutes)} · GeoMoon-derived, not live.{staticMode ? ' Still reconstruction.' : ''}</p>
      <dl className="iss-readout">
        <div><dt>From Earth’s centre</dt><dd>{state.geocentricDistanceKm.toLocaleString('en-US', { maximumFractionDigits: 0 })} km</dd></div>
        <div><dt>Source / frame</dt><dd>Astronomy Engine · EQJ</dd></div>
      </dl>
      <details className="iss-method">
        <summary>Ephemeris, time &amp; scale</summary>
        <div>
          <p>Astronomy Engine 2.1.19 calculates a geometric Moon-centre vector relative to Earth’s centre with <code>GeoMoon</code>. No live position, light-time or aberration correction, or independent numeric uncertainty is supplied.</p>
          <p><strong>Reference epoch</strong><br /><time dateTime={DEFAULT_MOON_EPOCH}>{DEFAULT_MOON_EPOCH}</time><br />Selections use UTC milliseconds. The library uses UT1 ≈ UTC and derives TT internally; this is not a visitor-clock or high-precision pointing model.</p>
          <p>Source vectors are geocentric EQJ/J2000 au. The scene retains a separate ECL/J2000 vector, maps it through (x,z,−y), and fixes separation at 3.45 scene units around an Earth radius of 2 before common screen-fit scaling. Direction is preserved; radial separation is compressed.</p>
          <p>The Moon is an enlarged schematic marker, not an observed surface portrait or calculated phase. The Earth texture is not time-registered. No surface, visibility, ground-track, or pointing claim is made.</p>
          <p>Manual steps stay inside {MOON_MIN_EPOCH} through {MOON_MAX_EPOCH}. This ±24 h interaction bound is not an accuracy guarantee. The 25-point trace samples 24 hours near the selected instant.</p>
          <p className="iss-hash">Manifest generated<br /><time dateTime={MOON_EXPEDITION.source.generatedAt}>{MOON_EXPEDITION.source.generatedAt}</time><br />{MOON_EXPEDITION.source.generationTimestampBasis}</p>
          <nav aria-label="Moon scientific sources"><a href={MOON_EXPEDITION.source.documentationUrl} target="_blank" rel="noreferrer">GeoMoon documentation <ArrowUpRight size={12} /></a><a href={MOON_EXPEDITION.source.url} target="_blank" rel="noreferrer">Ephemeris source <ArrowUpRight size={12} /></a></nav>
        </div>
      </details>
    </section>
  );
}
