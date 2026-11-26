import type { Catalogue, PlanetRow, ViewName } from '../types';
import { generateWorld, displayOrbit } from '../lib/world';
import { hashString, skyPosition } from '../lib/catalogue';
import { lookBackGeometry, nearbyHosts, solarDisplayBodies } from '../lib/goldenPath';

interface StaticSceneProps {
  catalogue: Catalogue;
  view: ViewName;
  planet: PlanetRow | null;
  onSelect: (planet: PlanetRow) => void;
}

export default function StaticScene({ catalogue, view, planet, onSelect }: StaticSceneProps) {
  if (view === 'earth') {
    return (
      <div className="static-scene static-earth-scene" data-testid="static-scene">
        <div
          className="static-earth"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}textures/earth-blue-marble.jpg)` }}
          role="img"
          aria-label="Still NASA Blue Marble composite of Earth; not a live cloud view"
        />
      </div>
    );
  }

  if (view === 'solar') {
    return (
      <div className="static-scene static-solar" data-testid="static-scene">
        <svg viewBox="-32 -32 64 64" role="img" aria-label="Still heliocentric model of eight planets at 26 November 2026 00:00 UTC; distances compressed and bodies enlarged">
          <circle cx="0" cy="0" r="1.1" fill="#e7c28d" />
          {solarDisplayBodies().map((body) => (
            <g key={body.name}>
              <circle cx="0" cy="0" r={body.displayRadius} fill="none" stroke="#789087" strokeOpacity="0.12" strokeWidth="0.06" />
              <circle cx={body.position.x} cy={body.position.z} r={body.radius} fill={body.color}>
                <title>{body.name}: modelled heliocentric position</title>
              </circle>
              {body.name === 'Earth' && <circle cx={body.position.x} cy={body.position.z} r="0.65" fill="none" stroke="#dac39e" strokeWidth="0.08" />}
            </g>
          ))}
        </svg>
      </div>
    );
  }

  if (view === 'neighbourhood') {
    return (
      <div className="static-scene static-neighbourhood" data-testid="static-scene">
        <svg viewBox="-32 -32 64 64" role="img" aria-label="Still map of the 96 nearest exoplanet hosts with complete archive positions; not a complete stellar census">
          {nearbyHosts(catalogue).map((host) => (
            <circle key={host.planet.hostname} cx={host.position.x} cy={host.position.z} r="0.16" fill={generateWorld(host.planet).starColor} opacity="0.82">
              <title>{host.planet.hostname}: {host.distancePc.toFixed(2)} parsecs, archive-reported</title>
            </circle>
          ))}
          <circle cx="0" cy="0" r="0.5" fill="#e5c49a"><title>Sun / home</title></circle>
        </svg>
      </div>
    );
  }

  if (view === 'lookback' && planet) {
    const geometry = lookBackGeometry(planet);
    return (
      <div className="static-scene static-lookback" data-testid="static-scene">
        <div className="static-home-path" aria-hidden="true" />
        <div className="static-home-sun" role="img" aria-label={geometry ? `Schematic direction from ${planet.hostname} towards the Sun and unresolved Earth, ${geometry.distancePc.toFixed(2)} parsecs` : 'Home direction unavailable'} />
      </div>
    );
  }

  if (view === 'planet' && planet) {
    const world = generateWorld(planet);
    return (
      <div className="static-scene static-planet" data-testid="static-scene">
        <div
          className={`static-globe static-${world.surface}`}
          style={{
            '--world-a': world.palette[0],
            '--world-b': world.palette[1],
            '--world-c': world.palette[2],
            '--world-light': world.starColor,
            '--world-turn': `${(world.seed % 40) - 20}deg`,
          } as React.CSSProperties}
          role="img"
          aria-label={`Still artistic reconstruction of ${planet.pl_name}`}
        />
      </div>
    );
  }

  if (view === 'system' && planet) {
    const siblings = catalogue.systems.get(planet.hostname) ?? [planet];
    return (
      <div className="static-scene static-system" data-testid="static-scene">
        <div className="static-star" style={{ background: generateWorld(planet).starColor }} />
        {siblings.map((item, index) => {
          const orbit = displayOrbit(item, index);
          const angle = (hashString(item.pl_name) % 360) * Math.PI / 180;
          const scale = 13 + orbit.radius * 7;
          const world = generateWorld(item);
          return (
            <div key={item.pl_name}>
              <span className="static-orbit" style={{ width: scale * 2, height: scale * 1.15 }} />
              <button
                className="static-system-planet"
                style={{ left: `calc(50% + ${Math.cos(angle) * scale}px)`, top: `calc(50% + ${Math.sin(angle) * scale * 0.55}px)`, background: world.palette[1] }}
                onClick={() => onSelect(item)}
                aria-label={`Select ${item.pl_name}`}
              />
            </div>
          );
        })}
      </div>
    );
  }

  if (view === 'atlas') {
    const systems = [...catalogue.systems.values()].slice(0, 900);
    return (
      <div className="static-scene static-atlas" data-testid="static-scene">
        <svg viewBox="-40 -40 80 80" role="img" aria-label="Still map of observed planetary systems; use search to select a world">
          {systems.map((siblings) => {
            const item = siblings[0];
            const point = skyPosition(item);
            return <circle key={item.hostname} cx={point.x} cy={-point.y} r="0.11" fill={generateWorld(item).starColor} opacity="0.7" />;
          })}
          <circle cx="0" cy="0" r="0.45" fill="#d7b58a" />
        </svg>
      </div>
    );
  }

  return null;
}
