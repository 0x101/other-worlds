import { ArrowLeft, ArrowRight, ArrowUpRight, Home, X } from 'lucide-react';
import type { Catalogue, PlanetRow, ViewName } from '../types';
import { GOLDEN_PLANET, VIEW_CONTEXT, lookBackGeometry, nearbyHosts, solarDisplayBodies } from '../lib/goldenPath';
import { GAIA_BY_ID, GAIA_NEIGHBOURHOOD, type GaiaStar } from '../lib/gaia';
import { DEFAULT_ISS_EPOCH } from '../lib/iss';
import { DEFAULT_MOON_EPOCH } from '../lib/moon';
import SolarTimeControls from './SolarTimeControls';
import IssExpedition from './IssExpedition';
import MoonExpedition from './MoonExpedition';

interface ExpeditionProps {
  catalogue: Catalogue;
  view: ViewName;
  planet: PlanetRow | null;
  gaiaStar: GaiaStar | null;
  solarEpoch: string;
  issEpoch: string | null;
  moonEpoch: string | null;
  solarPlaying: boolean;
  reducedMotion: boolean;
  staticMode: boolean;
  onView: (view: ViewName) => void;
  onSelect: (planet: PlanetRow) => void;
  onGaiaSelect: (star: GaiaStar | null) => void;
  onSolarEpoch: (epoch: string) => void;
  onIssEpoch: (epoch: string | null) => void;
  onMoonEpoch: (epoch: string | null) => void;
  onSolarPlayingChange: (playing: boolean) => void;
}

function Context({ view }: { view: ViewName }) {
  const context = VIEW_CONTEXT[view];
  return (
    <div className="scene-context" aria-label="Current observer, scale, and reference frame">
      <span>{context.position}</span><span>{context.scale}</span><span>{context.frame}</span>
    </div>
  );
}

export default function Expedition({ catalogue, view, planet, gaiaStar, solarEpoch, issEpoch, moonEpoch, solarPlaying, reducedMotion, staticMode, onView, onSelect, onGaiaSelect, onSolarEpoch, onIssEpoch, onMoonEpoch, onSolarPlayingChange }: ExpeditionProps) {
  if (view === 'earth') {
    return (
      <>
        <section className="expedition-copy earth-copy">
          <span className="section-label">You are here / Earth</span>
          <h1>This is<br /><em>home.</em></h1>
          <p>One rocky world around one ordinary star.<br />Every journey outward begins here.</p>
          <div className="expedition-actions">
            <button className="primary-button" onClick={() => onView('solar')}>Leave Earth <ArrowRight size={18} /></button>
            {!issEpoch && !moonEpoch && (
              <>
                <button className="text-button iss-open" onClick={() => onIssEpoch(DEFAULT_ISS_EPOCH)}>Meet the ISS <ArrowUpRight size={15} /></button>
                <button className="text-button moon-open" onClick={() => onMoonEpoch(DEFAULT_MOON_EPOCH)}>Meet the Moon <ArrowUpRight size={15} /></button>
              </>
            )}
            <button className="text-button" onClick={() => onView('atlas')}>Explore the exoplanet atlas <ArrowUpRight size={15} /></button>
          </div>
        </section>
        {issEpoch && <IssExpedition epoch={issEpoch} staticMode={staticMode} onEpoch={onIssEpoch} onClose={() => onIssEpoch(null)} />}
        {moonEpoch && <MoonExpedition epoch={moonEpoch} staticMode={staticMode} onEpoch={onMoonEpoch} onClose={() => onMoonEpoch(null)} />}
        <div className="earth-credit">NASA Blue Marble · composite imagery, not a live cloud view</div>
        <Context view={view} />
      </>
    );
  }

  if (view === 'solar') {
    const bodies = solarDisplayBodies(solarEpoch);
    return (
      <>
        <section className="expedition-copy solar-copy">
          <button className="back-button" onClick={() => onView('earth')}><ArrowLeft size={16} />Back to Earth</button>
          <span className="section-label">Our Solar System / selected epoch</span>
          <h1>A family<br />of <em>worlds.</em></h1>
          <p>Eight planets at your chosen instant.<br />{staticMode ? 'Still view · choose an instant below.' : 'Drag to change your viewpoint.'}</p>
          <div className="expedition-actions">
            <button className="primary-button" onClick={() => onView('neighbourhood')}>Travel to nearby suns <ArrowRight size={18} /></button>
          </div>
        </section>
        <SolarTimeControls epoch={solarEpoch} playing={solarPlaying} reducedMotion={reducedMotion} onEpoch={onSolarEpoch} onPlayingChange={onSolarPlayingChange} />
        <ol className="solar-worlds" aria-label="Planets in the selected-epoch Solar System model">
          {bodies.map((body) => <li key={body.name} className={body.name === 'Earth' ? 'is-earth' : ''}><i style={{ background: body.color }} />{body.name}{body.name === 'Earth' && <span>You are here</span>}</li>)}
        </ol>
        <div className="expedition-disclosure">Derived geometric heliocentric EQJ/J2000 au → ECL/J2000 display · no light-time or aberration correction · rings are guides</div>
        <Context view={view} />
      </>
    );
  }

  if (view === 'neighbourhood') {
    const hosts = nearbyHosts(catalogue);
    const destination = catalogue.byName.get(GOLDEN_PLANET);
    const stars = GAIA_NEIGHBOURHOOD.stars;
    return (
      <>
        <section className="expedition-copy neighbourhood-copy">
          <button className="back-button" onClick={() => onView('solar')}><ArrowLeft size={16} />Back to the Solar System</button>
          <span className="section-label">Gaia DR3 neighbourhood / J2016.0</span>
          <h1>Other suns.<br /><em>Real directions.</em></h1>
          <p>{stars.length} nearby stars with high-confidence Gaia astrometry. Larger lights mark {hosts.length} exoplanet hosts from the preserved NASA snapshot.</p>
          <div className="expedition-actions">
            {destination && <button className="primary-button" onClick={() => onSelect(destination)}>Plot course for TRAPPIST-1 <ArrowRight size={18} /></button>}
            <button className="text-button" onClick={() => onView('atlas')}>Open the full exoplanet atlas <ArrowUpRight size={15} /></button>
          </div>
          <details className="gaia-method">
            <summary>Catalogue &amp; distance method</summary>
            <div>
              <button className="icon-button gaia-method-close" onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')} aria-label="Close catalogue and distance method"><X size={14} /></button>
              <p>Largest-parallax sources inside a 20 pc gate, with G ≤ 12, parallax S/N ≥ 20, RUWE ≤ 1.4, at least 10 visibility periods, and five-parameter solutions. This is not a complete census.</p>
              <p>Positions are ICRS-aligned at J2016.0. Distances are Bailer–Jones geometric posterior medians with 16th–84th percentile intervals—not direct parallax inversion. Colour and point size are display encodings.</p>
              <label>Inspect by Gaia source ID
                <select value={gaiaStar?.source_id ?? ''} onChange={(event) => {
                  onGaiaSelect(GAIA_BY_ID.get(event.target.value) ?? null);
                  event.currentTarget.closest('details')?.removeAttribute('open');
                }}>
                  <option value="">Choose one of {stars.length} sources</option>
                  {stars.map((star) => <option key={star.source_id} value={star.source_id}>{star.source_id} · {star.r_med_geo.toFixed(2)} pc</option>)}
                </select>
              </label>
              <nav aria-label="Gaia scientific sources"><a href={GAIA_NEIGHBOURHOOD.source.catalogueDocumentation} target="_blank" rel="noreferrer">Gaia DR3 documentation <ArrowUpRight size={12} /></a><a href={GAIA_NEIGHBOURHOOD.source.distanceReference} target="_blank" rel="noreferrer">Distance method <ArrowUpRight size={12} /></a></nav>
            </div>
          </details>
        </section>
        {gaiaStar && (
          <aside className="gaia-inspector" aria-label="Selected Gaia source" aria-live="polite">
            <button className="icon-button" onClick={() => onGaiaSelect(null)} aria-label="Close Gaia source inspector"><X size={15} /></button>
            <span className="section-label">MEASURED ASTROMETRY · DERIVED DISTANCE</span>
            <strong>Gaia DR3 {gaiaStar.source_id}</strong>
            <dl>
              <div><dt>Distance</dt><dd>{gaiaStar.r_med_geo.toFixed(4)} pc <small>{gaiaStar.r_lo_geo.toFixed(4)}–{gaiaStar.r_hi_geo.toFixed(4)}</small></dd></div>
              <div><dt>Parallax</dt><dd>{gaiaStar.parallax.toFixed(3)} ± {gaiaStar.parallax_error.toFixed(3)} mas</dd></div>
              <div><dt>Gaia G / BP−RP</dt><dd>{gaiaStar.phot_g_mean_mag.toFixed(2)} / {gaiaStar.bp_rp.toFixed(2)} mag</dd></div>
              <div><dt>RUWE / visibility</dt><dd>{gaiaStar.ruwe.toFixed(2)} / {gaiaStar.visibility_periods_used} periods</dd></div>
            </dl>
            <span>J2016.0 · TCB · ICRS-aligned</span>
          </aside>
        )}
        <div className="expedition-disclosure">Gaia DR3 direction · geometric posterior distance · logarithmic display · not a complete census</div>
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
