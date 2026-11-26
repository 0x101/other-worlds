import { ArrowLeft, ArrowRight, ArrowUpRight, Home } from 'lucide-react';
import type { Catalogue, PlanetRow, ViewName } from '../types';
import { GOLDEN_PLANET, SOLAR_SNAPSHOT, VIEW_CONTEXT, lookBackGeometry, nearbyHosts, solarDisplayBodies } from '../lib/goldenPath';

interface ExpeditionProps {
  catalogue: Catalogue;
  view: ViewName;
  planet: PlanetRow | null;
  onView: (view: ViewName) => void;
  onSelect: (planet: PlanetRow) => void;
}

function Context({ view }: { view: ViewName }) {
  const context = VIEW_CONTEXT[view];
  return (
    <div className="scene-context" aria-label="Current observer, scale, and reference frame">
      <span>{context.position}</span><span>{context.scale}</span><span>{context.frame}</span>
    </div>
  );
}

export default function Expedition({ catalogue, view, planet, onView, onSelect }: ExpeditionProps) {
  if (view === 'earth') {
    return (
      <>
        <section className="expedition-copy earth-copy">
          <span className="section-label">You are here / Earth</span>
          <h1>This is<br /><em>home.</em></h1>
          <p>One rocky world around one ordinary star.<br />Every journey outward begins here.</p>
          <div className="expedition-actions">
            <button className="primary-button" onClick={() => onView('solar')}>Leave Earth <ArrowRight size={18} /></button>
            <button className="text-button" onClick={() => onView('atlas')}>Explore the exoplanet atlas <ArrowUpRight size={15} /></button>
          </div>
        </section>
        <div className="earth-credit">NASA Blue Marble · composite imagery, not a live cloud view</div>
        <Context view={view} />
      </>
    );
  }

  if (view === 'solar') {
    const bodies = solarDisplayBodies();
    return (
      <>
        <section className="expedition-copy solar-copy">
          <button className="back-button" onClick={() => onView('earth')}><ArrowLeft size={16} />Back to Earth</button>
          <span className="section-label">Our Solar System / fixed epoch</span>
          <h1>A family<br />of <em>worlds.</em></h1>
          <p>Eight planets at one explicit instant.<br />Drag to change your viewpoint.</p>
          <time dateTime={SOLAR_SNAPSHOT.epoch}>26 NOV 2026 · 00:00 UTC</time>
          <div className="expedition-actions">
            <button className="primary-button" onClick={() => onView('neighbourhood')}>Travel to nearby suns <ArrowRight size={18} /></button>
          </div>
        </section>
        <ol className="solar-worlds" aria-label="Planets in the fixed-epoch Solar System model">
          {bodies.map((body) => <li key={body.name} className={body.name === 'Earth' ? 'is-earth' : ''}><i style={{ background: body.color }} />{body.name}{body.name === 'Earth' && <span>You are here</span>}</li>)}
        </ol>
        <div className="expedition-disclosure">Derived heliocentric positions · distance rings are guides, not complete orbit paths</div>
        <Context view={view} />
      </>
    );
  }

  if (view === 'neighbourhood') {
    const hosts = nearbyHosts(catalogue);
    const destination = catalogue.byName.get(GOLDEN_PLANET);
    return (
      <>
        <section className="expedition-copy neighbourhood-copy">
          <button className="back-button" onClick={() => onView('solar')}><ArrowLeft size={16} />Back to the Solar System</button>
          <span className="section-label">Nearby exoplanet hosts / NASA snapshot</span>
          <h1>Other suns.<br /><em>Real directions.</em></h1>
          <p>The {hosts.length} nearest exoplanet-host systems here have complete archive positions. This is not a complete stellar census.</p>
          <div className="expedition-actions">
            {destination && <button className="primary-button" onClick={() => onSelect(destination)}>Plot course for TRAPPIST-1 <ArrowRight size={18} /></button>}
            <button className="text-button" onClick={() => onView('atlas')}>Open the full exoplanet atlas <ArrowUpRight size={15} /></button>
          </div>
        </section>
        <div className="expedition-disclosure">Archive-reported direction and distance · logarithmic display · Gaia layer not yet integrated</div>
        <Context view={view} />
      </>
    );
  }

  if (view === 'lookback' && planet) {
    const geometry = lookBackGeometry(planet);
    if (!geometry) return null;
    return (
      <>
        <section className="expedition-copy lookback-copy">
          <button className="back-button" onClick={() => onView('planet')}><ArrowLeft size={16} />Resume {planet.pl_name}</button>
          <span className="section-label">Looking back / {planet.hostname}</span>
          <h1>Home is<br /><em>a direction.</em></h1>
          <p>From {planet.hostname}, the Sun lies {geometry.distancePc.toFixed(2)} pc away in the catalogue’s geometry. Earth is far too small to resolve.</p>
          <div className="expedition-actions">
            <button className="primary-button" onClick={() => onView('earth')}><Home size={17} />Return to Earth</button>
            <button className="text-button" onClick={() => onView('planet')}>Resume the portrait <ArrowRight size={15} /></button>
          </div>
        </section>
        <div className="home-marker" aria-hidden="true"><span />Sun and Earth<span>unresolved at this scale</span></div>
        <div className="expedition-disclosure">Schematic look-back · archive direction · distance compressed · not an observed view</div>
        <Context view={view} />
      </>
    );
  }

  return null;
}
