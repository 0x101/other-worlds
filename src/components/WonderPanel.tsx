import { ArrowUpRight } from 'lucide-react';
import type { PlanetRow } from '../types';
import { wonderFor } from '../lib/wonder';

interface WonderPanelProps {
  planet: PlanetRow;
  onOpenEvidence: () => void;
}

export default function WonderPanel({ planet, onOpenEvidence }: WonderPanelProps) {
  const wonder = wonderFor(planet);
  return (
    <aside className="wonder-panel" aria-labelledby="wonder-title">
      <span className="section-label">Wonder / a field guide</span>
      <h2 id="wonder-title">Begin with what we know.</h2>
      <p className="wonder-summary">{wonder.summary}</p>
      <dl className="wonder-facts">
        {wonder.facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}<span className={`evidence-chip ${fact.status.toLowerCase()}`}>{fact.status}</span></dt>
            <dd>{fact.value}<small>{fact.explanation}</small></dd>
          </div>
        ))}
      </dl>
      <div className="wonder-provenance">
        <span><i className="measured" />Archive evidence</span><span><i className="imagined" />Portrait art</span>
      </div>
      <button className="text-button" onClick={onOpenEvidence}>Trace every value in the Observatory <ArrowUpRight size={14} /></button>
    </aside>
  );
}
