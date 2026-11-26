import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import type { Catalogue, EvidenceStatus, PlanetRow, Provenance } from '../types';
import { detectionLabels, evidenceFor } from '../lib/evidence';

interface EvidencePanelProps {
  planet: PlanetRow;
  catalogue: Catalogue;
  provenance: Provenance;
  onClose: () => void;
}

const STATUS_COPY: Record<EvidenceStatus, string> = {
  MEASURED: 'Archive-reported source values. Some source fields are themselves modeled; read the notes.',
  DERIVED: 'Transparent calculations and display rules applied by Other Worlds.',
  IMAGINED: 'Deterministic artistic reconstruction — never an observation.',
};

export default function EvidencePanel({ planet, catalogue, provenance, onClose }: EvidencePanelProps) {
  const [status, setStatus] = useState<EvidenceStatus>('MEASURED');
  const siblings = catalogue.systems.get(planet.hostname) ?? [planet];
  const evidence = useMemo(() => evidenceFor(planet, siblings), [planet, siblings]);
  const detections = detectionLabels(planet);
  const counts = useMemo(() => ({
    MEASURED: evidence.filter((item) => item.status === 'MEASURED').length,
    DERIVED: evidence.filter((item) => item.status === 'DERIVED').length,
    IMAGINED: evidence.filter((item) => item.status === 'IMAGINED').length,
  }), [evidence]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [onClose]);

  return (
    <div className="evidence-layer">
      <button className="evidence-backdrop" onClick={onClose} aria-label="Close evidence inspector" />
      <aside className="evidence-panel" role="dialog" aria-modal="true" aria-labelledby="evidence-title">
        <header className="evidence-header">
          <div><span className="section-label">Field notes / {planet.hostname}</span><h2 id="evidence-title">What do we know?</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close evidence" autoFocus><X size={20} /></button>
        </header>
        <p className="evidence-intro">The portrait is a reconstruction. The evidence is not.</p>
        <div className="evidence-tabs" aria-label="Evidence categories">
          {(['MEASURED', 'DERIVED', 'IMAGINED'] as EvidenceStatus[]).map((name) => (
            <button key={name} className={status === name ? 'active' : ''} aria-pressed={status === name} onClick={() => setStatus(name)}>
              {name}<span>{counts[name]}</span>
            </button>
          ))}
        </div>
        <p className="status-copy">{STATUS_COPY[status]}</p>
        {status === 'MEASURED' && (
          <div className="detections"><span>Detection flags</span><p>{detections.length ? detections.join(' · ') : 'No positive detection flags in this snapshot'}</p></div>
        )}
        <dl className="evidence-list">
          {evidence.filter((item) => item.status === status).map((item) => (
            <div key={item.label} className={item.value === 'Unknown' ? 'is-unknown' : ''}>
              <dt>{item.label}<small>{item.source}</small></dt>
              <dd>{item.value}{item.note && <small>{item.note}</small>}</dd>
            </div>
          ))}
        </dl>
        <footer className="evidence-footer">
          <p>{provenance.compositeCaveat}</p>
          <p>Snapshot: {new Date(provenance.fetchedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC · {provenance.rowCount.toLocaleString('en-US')} rows. Nulls remain Unknown.</p>
          <a href={provenance.requestUrl} target="_blank" rel="noreferrer">Open the exact NASA TAP request <ArrowUpRight size={14} /></a>
        </footer>
      </aside>
    </div>
  );
}
