import { ArrowRight, X } from 'lucide-react';
import type { Catalogue, PlanetRow } from '../types';
import { CURATED_JOURNEYS, journeyWorlds } from '../lib/wonder';
import { formatValue } from '../lib/world';
import { useDialogFocus } from '../lib/useDialogFocus';

interface JourneysPanelProps {
  catalogue: Catalogue;
  onSelect: (planet: PlanetRow) => void;
  onClose: () => void;
}

export default function JourneysPanel({ catalogue, onSelect, onClose }: JourneysPanelProps) {
  const dialogRef = useDialogFocus<HTMLElement>(onClose);
  return (
    <div className="journey-layer">
      <button className="journey-backdrop" onClick={onClose} aria-label="Close curated journeys" />
      <section ref={dialogRef} className="journeys-panel" role="dialog" aria-modal="true" aria-labelledby="journeys-title">
        <header className="evidence-header">
          <div><span className="section-label">Curated journeys / real catalogue entries</span><h2 id="journeys-title">Follow a curiosity.</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close curated journeys"><X size={20} /></button>
        </header>
        <p className="journeys-intro">Three ways into the archive. No synthetic destinations, invented weather, or promises of habitability.</p>
        <div className="journey-list">
          {CURATED_JOURNEYS.map((journey) => {
            const worlds = journeyWorlds(catalogue, journey);
            return (
              <article key={journey.id}>
                <h3>{journey.title}</h3>
                <p>{journey.description}</p>
                <div className="journey-stops" aria-label={`Worlds in ${journey.title}`}>
                  {worlds.map((planet) => (
                    <button key={planet.pl_name} onClick={() => onSelect(planet)}>
                      <span><strong>{planet.pl_name}</strong><small>{journey.id === 'short-years' ? `${formatValue(planet.pl_orbper === null ? null : planet.pl_orbper * 24, 'hours', 1)} · derived from period` : planet.discoverymethod ?? 'Discovery method unknown'}</small></span>
                      <ArrowRight size={17} />
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
