import type { PlanetRow } from '../types';
import { orbitalFingerprint } from '../lib/fingerprint';
import { generateWorld } from '../lib/world';

interface OrbitalFingerprintProps {
  planets: PlanetRow[];
  compact?: boolean;
}

export default function OrbitalFingerprint({ planets, compact = false }: OrbitalFingerprintProps) {
  const fingerprint = orbitalFingerprint(planets);
  return (
    <figure className={`orbital-fingerprint ${compact ? 'compact' : ''}`}>
      <svg viewBox="0 0 220 220" role="img" aria-label={`Derived orbital fingerprint for ${fingerprint.host}: ${fingerprint.worldCount} catalogued worlds, ${fingerprint.knownPeriodCount} known periods`}>
        <circle cx="110" cy="110" r="104" fill="none" stroke="currentColor" strokeOpacity="0.12" />
        <circle cx="110" cy="110" r="4" fill="currentColor" fillOpacity="0.8" />
        {fingerprint.orbits.map((orbit) => {
          const squash = orbit.eccentricity === null ? 1 : 1 - orbit.eccentricity * 0.42;
          return <ellipse key={orbit.planet} cx="110" cy="110" rx={orbit.radius} ry={orbit.radius * squash} fill="none" stroke="currentColor" strokeOpacity={orbit.eccentricity === null ? 0.17 : 0.38} strokeDasharray={orbit.eccentricity === null ? '2 5' : undefined} transform={`rotate(${orbit.rotation} 110 110)`} />;
        })}
        {fingerprint.markers.map((marker) => {
          const world = generateWorld(planets.find((planet) => planet.pl_name === marker.planet) ?? planets[0]);
          const angle = marker.angle * Math.PI / 180;
          const orbit = fingerprint.orbits.find((item) => item.planet === marker.planet);
          const squash = orbit?.eccentricity == null ? 1 : 1 - orbit.eccentricity * 0.42;
          const rotation = (orbit?.rotation ?? 0) * Math.PI / 180;
          const localX = Math.cos(angle) * (marker.orbitRadius ?? 104);
          const localY = Math.sin(angle) * (marker.orbitRadius ?? 104) * squash;
          const x = 110 + localX * Math.cos(rotation) - localY * Math.sin(rotation);
          const y = 110 + localX * Math.sin(rotation) + localY * Math.cos(rotation);
          return <circle key={marker.planet} cx={x} cy={y} r={marker.radius ?? 2.4} fill={marker.radius === null ? 'transparent' : world.palette[2]} stroke={world.palette[2]} strokeWidth="1" data-planet={marker.planet} />;
        })}
        {fingerprint.markers.filter((marker) => marker.orbitRadius === null).map((marker) => {
          const angle = (marker.lane / Math.max(1, fingerprint.worldCount)) * Math.PI * 2;
          return <line key={`unknown-${marker.planet}`} x1={110 + Math.cos(angle) * 98} y1={110 + Math.sin(angle) * 98} x2={110 + Math.cos(angle) * 104} y2={110 + Math.sin(angle) * 104} stroke="currentColor" strokeOpacity="0.5" />;
        })}
      </svg>
      {!compact && <figcaption><span>ORBITAL FINGERPRINT / DERIVED ART</span><small>{fingerprint.worldCount} worlds · {fingerprint.knownPeriodCount} known periods · signature {fingerprint.signature}</small></figcaption>}
    </figure>
  );
}
