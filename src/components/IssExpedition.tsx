import { ArrowUpRight, ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';
import {
  DEFAULT_ISS_EPOCH,
  ISS_EXPEDITION,
  ISS_MAX_EPOCH,
  ISS_MIN_EPOCH,
  ISS_STEP_MINUTES,
  formatIssEpoch,
  formatIssOffset,
  issSourceAgeLabel,
  issStateAt,
  shiftIssEpoch,
} from '../lib/iss';

interface IssExpeditionProps {
  epoch: string;
  staticMode: boolean;
  onEpoch: (epoch: string) => void;
  onClose: () => void;
}

export default function IssExpedition({ epoch, staticMode, onEpoch, onClose }: IssExpeditionProps) {
  const state = issStateAt(epoch);
  return (
    <section className="iss-expedition" aria-label="International Space Station archived orbit expedition">
      <div className="iss-heading">
        <div><span className="section-label">DERIVED ORBIT · NORAD 25544</span><h2>ISS <em>(ZARYA)</em></h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close ISS expedition"><X size={15} /></button>
      </div>
      <div className="iss-selected-time"><span>Selected instant · UTC</span><time dateTime={epoch}>{formatIssEpoch(epoch)}</time></div>
      <div className="iss-time-actions">
        <button className="icon-button" onClick={() => onEpoch(shiftIssEpoch(epoch, -ISS_STEP_MINUTES))} disabled={epoch === ISS_MIN_EPOCH} aria-label="Previous 10 minutes" title="Ten minutes earlier"><ChevronLeft size={17} /></button>
        <button className="icon-button" onClick={() => onEpoch(shiftIssEpoch(epoch, ISS_STEP_MINUTES))} disabled={epoch === ISS_MAX_EPOCH} aria-label="Next 10 minutes" title="Ten minutes later"><ChevronRight size={17} /></button>
        <button className="text-button" onClick={() => onEpoch(DEFAULT_ISS_EPOCH)} disabled={epoch === DEFAULT_ISS_EPOCH} aria-label="Reset to ISS source epoch"><RotateCcw size={14} />Source epoch</button>
      </div>
      <p className="iss-status" role="status">{formatIssOffset(state.offsetMinutes)} · SGP4-derived, not live.{staticMode ? ' Still reconstruction.' : ''}</p>
      <dl className="iss-readout">
        <div><dt>From Earth’s centre</dt><dd>{state.geocentricDistanceKm.toFixed(1)} km</dd></div>
        <div><dt>Source / frame</dt><dd>CelesTrak OMM · TEME</dd></div>
      </dl>
      <details className="iss-method">
        <summary>Orbit, staleness &amp; scale</summary>
        <div>
          <p>One historical OMM propagated locally with satellite.js 7.2.0. No live position, runtime refresh, light-time correction, or numeric SGP4 uncertainty is supplied.</p>
          <p><strong>Exact source epoch</strong><br /><time dateTime={ISS_EXPEDITION.source.sourceEpoch}>{ISS_EXPEDITION.source.sourceEpoch}</time></p>
          <p><strong>Retrieval recorded</strong><br /><time dateTime={ISS_EXPEDITION.source.retrievedAt}>{ISS_EXPEDITION.source.retrievedAt}</time><br />{issSourceAgeLabel()}. The timestamp records local preservation; upstream response headers were not retained.</p>
          <p>Positions are Earth-centred TEME kilometres. The scene maps TEME (x,z,−y), preserves direction, and fixes the ISS trace at 2.65 scene units around an Earth radius of 2. Radial separation is exaggerated; the Earth texture is not time-registered. No ground track, visibility, or pointing claim.</p>
          <p>Manual steps stay inside {ISS_MIN_EPOCH} through {ISS_MAX_EPOCH}. This ±12 h interaction bound is not an accuracy guarantee. The 47-point trace samples 92 minutes near the selected instant.</p>
          <p className="iss-hash">Raw SHA-256<br />{ISS_EXPEDITION.source.rawSha256}</p>
          <nav aria-label="ISS scientific sources"><a href={ISS_EXPEDITION.source.requestUrl} target="_blank" rel="noreferrer">Current CelesTrak OMM <ArrowUpRight size={12} /></a><a href={ISS_EXPEDITION.propagator.url} target="_blank" rel="noreferrer">Propagator source <ArrowUpRight size={12} /></a></nav>
        </div>
      </details>
    </section>
  );
}
