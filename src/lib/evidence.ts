import type { EvidenceItem, PlanetRow, TraceabilityRow, TraceableField } from '../types';
import { derivedGravity, displayOrbit, formatValue, generateWorld } from './world';
import { formatMeasurement, parseReference } from './traceability';

export function evidenceFor(planet: PlanetRow, siblings: PlanetRow[], trace?: TraceabilityRow | null): EvidenceItem[] {
  const world = generateWorld(planet);
  const orbit = displayOrbit(planet, Math.max(0, siblings.findIndex((item) => item.pl_name === planet.pl_name)));
  const gravity = derivedGravity(planet);
  const measured = (label: string, value: number | string | null, source: string, unit = '', note?: string, field?: TraceableField): EvidenceItem => {
    const measurement = field ? trace?.measurements[field] : undefined;
    const limit = measurement?.limit ? `${measurement.limit > 0 ? 'Upper' : 'Lower'} limit flag reported by the archive.` : '';
    return {
      label,
      value: measurement ? formatMeasurement(measurement, unit) : formatValue(value, unit),
      status: 'MEASURED', source,
      note: [note, limit].filter(Boolean).join(' ') || undefined,
      reference: measurement?.reference,
    };
  };
  return [
    measured('Planet radius', planet.pl_rade, 'NASA pscomppars.pl_rade', 'R⊕', undefined, 'pl_rade'),
    measured('Planet mass', planet.pl_bmasse, 'NASA pscomppars.pl_bmasse', 'M⊕', planet.pl_bmassprov ? `Archive best-mass provenance: ${planet.pl_bmassprov}.` : 'Best available mass field; provenance is not supplied.', 'pl_bmasse'),
    measured('Planet density', planet.pl_dens, 'NASA pscomppars.pl_dens', 'g/cm³', undefined, 'pl_dens'),
    measured('Equilibrium temperature', planet.pl_eqt, 'NASA pscomppars.pl_eqt', 'K', 'Archive black-body model value; not a direct surface-temperature reading.', 'pl_eqt'),
    measured('Insolation', planet.pl_insol, 'NASA pscomppars.pl_insol', 'Earth flux', undefined, 'pl_insol'),
    measured('Orbital period', planet.pl_orbper, 'NASA pscomppars.pl_orbper', 'days', undefined, 'pl_orbper'),
    measured('Semi-major axis', planet.pl_orbsmax, 'NASA pscomppars.pl_orbsmax', 'au', undefined, 'pl_orbsmax'),
    measured('Eccentricity', planet.pl_orbeccen, 'NASA pscomppars.pl_orbeccen', '', undefined, 'pl_orbeccen'),
    measured('Host temperature', planet.st_teff, 'NASA pscomppars.st_teff', 'K', undefined, 'st_teff'),
    measured('Host radius', planet.st_rad, 'NASA pscomppars.st_rad', 'R☉', undefined, 'st_rad'),
    measured('Host mass', planet.st_mass, 'NASA pscomppars.st_mass', 'M☉', undefined, 'st_mass'),
    measured('Host spectral type', planet.st_spectype, 'NASA pscomppars.st_spectype'),
    measured('Host luminosity', planet.st_lum, 'NASA pscomppars.st_lum', 'log₁₀(L☉)', undefined, 'st_lum'),
    measured('Distance', planet.sy_dist, 'NASA pscomppars.sy_dist', 'pc', undefined, 'sy_dist'),
    measured('Right ascension', planet.ra, 'NASA pscomppars.ra', '°'),
    measured('Declination', planet.dec, 'NASA pscomppars.dec', '°'),
    measured('System planets', planet.sy_pnum, 'NASA pscomppars.sy_pnum'),
    measured('System stars', planet.sy_snum, 'NASA pscomppars.sy_snum'),
    measured('Circumbinary flag', planet.cb_flag === null ? null : planet.cb_flag === 1 ? 'Yes' : 'No', 'NASA pscomppars.cb_flag'),
    measured('Controversial flag', planet.pl_controv_flag === null ? null : planet.pl_controv_flag === 1 ? 'Yes' : 'No', 'NASA pscomppars.pl_controv_flag', '', 'Yes means the confirmation status has been questioned in published literature.'),
    measured('Discovery', planet.disc_year, 'NASA pscomppars.disc_year'),
    measured('Method', planet.discoverymethod, 'NASA pscomppars.discoverymethod'),
    measured('Facility', planet.disc_facility, 'NASA pscomppars.disc_facility'),
    {
      label: 'Discovery publication', value: trace?.discoveryReference?.label ?? parseReference(planet.disc_refname)?.label ?? 'Unknown',
      status: 'MEASURED', source: 'NASA pscomppars.disc_refname', reference: trace?.discoveryReference ?? parseReference(planet.disc_refname),
    },
    measured('Discovery telescope', trace?.telescope ?? null, 'NASA pscomppars.disc_telescope'),
    measured('Discovery instrument', trace?.instrument ?? null, 'NASA pscomppars.disc_instrument'),
    {
      label: 'Surface gravity', value: formatValue(gravity, 'm/s²'), status: 'DERIVED',
      source: 'g = 9.80665 × pl_bmasse / pl_rade²', note: 'Calculated only when both archive mass and radius are present; no habitability claim follows.',
    },
    {
      label: 'World class', value: world.kindLabel, status: 'DERIVED',
      source: 'Radius/mass thresholds documented in DATA.md', note: 'A visualization category, not an official NASA classification.',
    },
    {
      label: 'Displayed orbit radius', value: `${orbit.radius.toFixed(2)} scene units`, status: orbit.basis,
      source: orbit.basis === 'MEASURED' ? 'Compressed from pl_orbsmax' : orbit.basis === 'DERIVED' ? 'Kepler estimate from period and host mass, then compressed' : 'Index-spaced because orbital scale is unavailable',
      note: 'Scene geometry is compressed and never a to-scale orbital ephemeris.',
    },
    {
      label: 'Surface & clouds', value: world.surface === 'terrain' ? 'Procedural rocky relief' : 'Procedural atmospheric bands / clouds', status: 'IMAGINED',
      source: `Deterministic seed: ${planet.pl_name} → ${world.seed}`, note: 'Artistic reconstruction. No observed surface map or cloud pattern is implied.',
    },
    {
      label: 'Palette & atmosphere', value: `${world.temperatureBand}; seed ${world.seed}`, status: 'IMAGINED',
      source: 'Temperature-informed palette with deterministic artistic variation', note: 'Atmosphere thickness, color and composition are not measured here.',
    },
    {
      label: 'Orbital phase & inclination', value: 'Illustrative', status: 'IMAGINED',
      source: 'Deterministic scene layout', note: 'Positions are not valid for a particular date.',
    },
  ];
}

export function detectionLabels(planet: PlanetRow): string[] {
  const detections: [keyof PlanetRow, string][] = [
    ['tran_flag', 'Transit'], ['rv_flag', 'Radial velocity'], ['ttv_flag', 'Transit timing'],
    ['pul_flag', 'Pulsar timing'], ['ptv_flag', 'Pulsation timing'], ['ast_flag', 'Astrometry'],
    ['obm_flag', 'Orbital brightness'], ['micro_flag', 'Microlensing'], ['etv_flag', 'Eclipse timing'],
    ['ima_flag', 'Direct imaging'], ['dkin_flag', 'Disk kinematics'],
  ];
  return detections.filter(([field]) => planet[field] === 1).map(([, label]) => label);
}
