import type { Catalogue, PlanetRow, ViewName } from '../types';
import { generateWorld, displayOrbit } from '../lib/world';
import { hashString, skyPosition } from '../lib/catalogue';

interface StaticSceneProps {
  catalogue: Catalogue;
  view: ViewName;
  planet: PlanetRow | null;
  onSelect: (planet: PlanetRow) => void;
}

export default function StaticScene({ catalogue, view, planet, onSelect }: StaticSceneProps) {
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
