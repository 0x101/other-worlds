import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Orbit, Share2 } from 'lucide-react';
import Scene from './components/Scene';
import StaticScene from './components/StaticScene';
import SearchPanel from './components/SearchPanel';
import EvidencePanel from './components/EvidencePanel';
import WonderPanel from './components/WonderPanel';
import JourneysPanel from './components/JourneysPanel';
import type { Catalogue, ExperienceName, JourneyState, PlanetRow, Provenance, TraceabilityCatalogue } from './types';
import { parseCatalogue } from './lib/catalogue';
import { parseTraceability, validateTraceability } from './lib/traceability';
import { DEFAULT_JOURNEY, parseJourney, updateBrowserUrl } from './lib/urlState';
import { formatValue, generateWorld } from './lib/world';

export default function App() {
  const [journey, setJourney] = useState<JourneyState>(() => parseJourney(window.location.search));
  const journeyRef = useRef(journey);
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [provenance, setProvenance] = useState<Provenance | null>(null);
  const [traceability, setTraceability] = useState<TraceabilityCatalogue | null>(null);
  const [traceProvenance, setTraceProvenance] = useState<Provenance | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [journeysOpen, setJourneysOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [lowPower] = useState(() => window.innerWidth < 700 || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4));

  const navigate = useCallback((patch: Partial<JourneyState>, mode: 'push' | 'replace' = 'push') => {
    const next = { ...journeyRef.current, ...patch };
    journeyRef.current = next;
    setJourney(next);
    updateBrowserUrl(next, mode);
  }, []);

  useEffect(() => {
    const popstate = () => {
      const next = parseJourney(window.location.search);
      journeyRef.current = next;
      setJourney(next);
    };
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    window.addEventListener('popstate', popstate);
    motion.addEventListener('change', motionChange);
    return () => { window.removeEventListener('popstate', popstate); motion.removeEventListener('change', motionChange); };
  }, []);

  useEffect(() => {
    let active = true;
    setLoadError(null);
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/pscomppars.json`).then((response) => { if (!response.ok) throw new Error(`Catalogue request failed (${response.status}).`); return response.json(); }),
      fetch(`${import.meta.env.BASE_URL}data/provenance.json`).then((response) => { if (!response.ok) throw new Error(`Provenance request failed (${response.status}).`); return response.json(); }),
      fetch(`${import.meta.env.BASE_URL}data/pscomppars-traceability.json`).then((response) => { if (!response.ok) throw new Error(`Traceability request failed (${response.status}).`); return response.json(); }),
      fetch(`${import.meta.env.BASE_URL}data/traceability-provenance.json`).then((response) => { if (!response.ok) throw new Error(`Traceability provenance request failed (${response.status}).`); return response.json(); }),
    ]).then(([raw, source, traceRaw, traceSource]: [unknown, Provenance, unknown, Provenance]) => {
      if (!active) return;
      const parsed = parseCatalogue(raw);
      const parsedTrace = parseTraceability(traceRaw);
      if (parsed.planets.length !== source.rowCount) throw new Error(`Snapshot integrity mismatch: ${parsed.planets.length} rows loaded, ${source.rowCount} expected.`);
      if (parsedTrace.rows.length !== traceSource.rowCount) throw new Error(`Traceability snapshot integrity mismatch: ${parsedTrace.rows.length} rows loaded, ${traceSource.rowCount} expected.`);
      validateTraceability(parsed, parsedTrace);
      setCatalogue(parsed);
      setProvenance(source);
      setTraceability(parsedTrace);
      setTraceProvenance(traceSource);
    }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'The catalogue could not be read.');
    });
    return () => { active = false; };
  }, [loadAttempt]);

  const selected = journey.planetName && catalogue ? catalogue.byName.get(journey.planetName) ?? null : null;
  const siblings = useMemo(() => selected && catalogue ? catalogue.systems.get(selected.hostname) ?? [selected] : [], [catalogue, selected]);
  const world = selected ? generateWorld(selected) : null;

  useEffect(() => {
    if (catalogue && journey.planetName && !selected) {
      setToast(`“${journey.planetName}” is not in this catalogue snapshot.`);
      navigate({ view: 'atlas', planetName: null, experience: 'wonder', evidenceOpen: false }, 'replace');
    }
  }, [catalogue, journey.planetName, selected, navigate]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function goToAtlas() {
    navigate({ view: 'atlas', planetName: null, experience: 'wonder', evidenceOpen: false, camera: DEFAULT_JOURNEY.camera });
  }

  function selectPlanet(planet: PlanetRow) {
    setJourneysOpen(false);
    navigate({ view: 'system', planetName: planet.pl_name, evidenceOpen: false, camera: DEFAULT_JOURNEY.camera });
  }

  function goBack() {
    if (journey.view === 'planet') navigate({ view: 'system', experience: journey.experience === 'studio' ? 'wonder' : journey.experience, evidenceOpen: false });
    else goToAtlas();
  }

  function openExperience(experience: ExperienceName) {
    if (experience === 'observatory') navigate({ view: 'planet', experience, evidenceOpen: true });
    else navigate({ experience, evidenceOpen: false });
  }

  async function shareView() {
    updateBrowserUrl(journeyRef.current, 'replace');
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast('A link to this exact view is on your clipboard.');
    } catch {
      setToast('Clipboard access was blocked. Copy the URL from your address bar.');
    }
  }

  return (
    <main className={`app view-${journey.view} experience-${journey.experience} ${sceneReady ? 'scene-ready' : ''}`} data-view={journey.view}>
      <div className="scene-poster" aria-hidden="true"><span /><span /><span /></div>
      {catalogue && !sceneFailed && (
        <Scene
          catalogue={catalogue}
          view={journey.view}
          planet={selected}
          cameraState={journey.camera}
          reducedMotion={reducedMotion}
          lowPower={lowPower}
          onSelect={selectPlanet}
          onCameraChange={(camera) => navigate({ camera }, 'replace')}
          onReady={() => setSceneReady(true)}
          onFailure={() => { setSceneFailed(true); setSceneReady(true); }}
        />
      )}
      {catalogue && sceneFailed && <StaticScene catalogue={catalogue} view={journey.view} planet={selected} onSelect={selectPlanet} />}
      <div className="scene-vignette" aria-hidden="true" />

      <header className="app-header">
        <button className="brand" onClick={goToAtlas} aria-label="Other Worlds — return to atlas">
          <Orbit size={25} strokeWidth={1.25} />
          <span>OTHER<br />WORLDS</span>
        </button>
        <div className="journey-position" aria-live="polite">
          {journey.view === 'atlas' ? 'OBSERVED SKY' : journey.view === 'system' ? selected?.hostname : 'PLANET PORTRAIT'}
        </div>
        <nav className="header-actions" aria-label="View actions">
          {selected && <button className="text-button evidence-open" onClick={() => openExperience('observatory')}>Evidence</button>}
          {selected && <button className="icon-button" onClick={shareView} aria-label="Share this exact view"><Share2 size={18} /></button>}
          {provenance && <a className="source-link" href={provenance.sourceUrl} target="_blank" rel="noreferrer">NASA / TAP <ArrowUpRight size={14} /></a>}
        </nav>
      </header>

      {!catalogue && !loadError && (
        <section className="loading-state" aria-live="polite">
          <Orbit size={34} strokeWidth={1} />
          <h1>Opening the field atlas</h1>
          <p>Reading the included NASA Exoplanet Archive snapshot…</p>
          <span className="loading-line" />
        </section>
      )}

      {loadError && (
        <section className="error-state" role="alert">
          <span className="section-label">DATA CONNECTION INTERRUPTED</span>
          <h1>The atlas could not be opened.</h1>
          <p>{loadError}</p>
          <button className="primary-button" onClick={() => setLoadAttempt((value) => value + 1)}>Try the snapshot again <ArrowRight size={17} /></button>
          <a href="https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html" target="_blank" rel="noreferrer">Check the NASA TAP documentation <ArrowUpRight size={14} /></a>
        </section>
      )}

      {catalogue && journey.view === 'atlas' && (
        <>
          <section className="atlas-intro">
            <span className="section-label">AN EXOPLANET FIELD ATLAS</span>
            <h1>The sky is full<br />of <em>places.</em></h1>
            <p>Every confirmed exoplanet.<br />One continuous journey.</p>
            <div className="catalogue-count"><strong>{catalogue.planets.length.toLocaleString('en-US')}</strong> worlds <span /> <strong>{catalogue.systems.size.toLocaleString('en-US')}</strong> systems</div>
            <button className="journeys-open text-button" onClick={() => setJourneysOpen(true)}><BookOpen size={15} />Follow a curated journey</button>
          </section>
          <SearchPanel
            catalogue={catalogue}
            query={journey.query}
            filter={journey.filter}
            onQuery={(query) => navigate({ query }, 'replace')}
            onFilter={(filter) => navigate({ filter }, 'replace')}
            onSelect={selectPlanet}
          />
          <div className="atlas-hint"><span className="mouse-mark" />Drag to orbit · Scroll to travel<br /><small>Select a light or find a world</small></div>
        </>
      )}

      {catalogue && selected && journey.view !== 'atlas' && world && (
        <>
          <section className="world-intro">
            <button className="back-button" onClick={goBack}><ArrowLeft size={16} />{journey.view === 'planet' ? 'Back to the system' : 'Back to the observed sky'}</button>
            <nav className="experience-nav" aria-label="Interpretation mode">
              {(['wonder', 'observatory'] as ExperienceName[]).map((experience) => (
                <button key={experience} className={journey.experience === experience ? 'active' : ''} aria-pressed={journey.experience === experience} onClick={() => openExperience(experience)}>{experience === 'wonder' ? 'Wonder' : 'Observatory'}</button>
              ))}
            </nav>
            <span className="section-label">{journey.view === 'planet' ? `${world.kindLabel} / DERIVED CLASS` : `${siblings.length} CATALOGUED ${siblings.length === 1 ? 'WORLD' : 'WORLDS'} / ${selected.hostname}`}</span>
            <h1>{journey.view === 'planet' ? selected.pl_name : selected.hostname}</h1>
            {journey.view === 'system' ? (
              <p>Now inspecting <strong>{selected.pl_name}</strong><br />{formatValue(selected.sy_dist, 'pc')} from Earth · discovered {formatValue(selected.disc_year)}</p>
            ) : (
              <p>A portrait shaped by evidence.<br />A world that remains, in part, imagined.</p>
            )}
            <div className="world-facts">
              <div><span>Radius</span><strong>{formatValue(selected.pl_rade, 'R⊕')}</strong></div>
              <div><span>Equilibrium</span><strong>{formatValue(selected.pl_eqt, 'K', 0)}</strong></div>
              <div><span>Orbital period</span><strong>{formatValue(selected.pl_orbper, 'days')}</strong></div>
            </div>
          </section>

          {journey.view === 'system' && (
            <>
              <div className="system-actions">
                <button className="primary-button" onClick={() => navigate({ view: 'planet', camera: DEFAULT_JOURNEY.camera, evidenceOpen: false })}>
                  Approach {selected.pl_name} <ArrowRight size={18} />
                </button>
                <span>Orbital scales compressed · phases illustrative</span>
              </div>
              <div className="sibling-rail" aria-label={`Worlds in the ${selected.hostname} system`}>
                {siblings.map((planet) => (
                  <button key={planet.pl_name} className={planet.pl_name === selected.pl_name ? 'active' : ''} aria-pressed={planet.pl_name === selected.pl_name} onClick={() => selectPlanet(planet)}>
                    <span style={{ background: generateWorld(planet).palette[1] }} />{planet.pl_name.replace(selected.hostname, '').trim() || planet.pl_name}
                  </button>
                ))}
              </div>
            </>
          )}

          {journey.view === 'planet' && journey.experience === 'wonder' && <WonderPanel planet={selected} onOpenEvidence={() => openExperience('observatory')} />}

          {journey.view === 'planet' && (
            <div className="planet-actions">
              <button className="primary-button" onClick={() => openExperience('observatory')}>Inspect the evidence <ArrowRight size={18} /></button>
              <button className="text-button" onClick={shareView}><Share2 size={16} />Share this view</button>
              <span>Illustrative {world.surface === 'terrain' ? 'terrain' : 'atmosphere'} · seed {world.seed}</span>
            </div>
          )}
        </>
      )}

      {catalogue && provenance && traceability && traceProvenance && selected && journey.evidenceOpen && (
        <EvidencePanel
          planet={selected}
          catalogue={catalogue}
          provenance={provenance}
          traceProvenance={traceProvenance}
          trace={traceability.byName.get(selected.pl_name) ?? null}
          onClose={() => navigate({ experience: 'wonder', evidenceOpen: false }, 'replace')}
        />
      )}
      {catalogue && journeysOpen && <JourneysPanel catalogue={catalogue} onSelect={selectPlanet} onClose={() => setJourneysOpen(false)} />}

      {sceneFailed && <div className="fallback-notice" role="status">3D is unavailable. Still reconstructions are active; the full journey remains accessible.</div>}
      {toast && <div className="toast" role="status">{toast}</div>}
      <div key={`${journey.view}-${selected?.pl_name ?? 'atlas'}`} className="journey-wipe" aria-hidden="true" />
    </main>
  );
}
