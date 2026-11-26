import type { Catalogue, EvidenceStatus, PlanetRow } from '../types';
import { derivedGravity, formatValue, generateWorld } from './world';

export interface WonderFact {
  label: string;
  value: string;
  explanation: string;
  status: EvidenceStatus;
}

export interface CuratedJourney {
  id: string;
  title: string;
  description: string;
  planetNames: string[];
}

export const CURATED_JOURNEYS: CuratedJourney[] = [
  {
    id: 'seven-worlds',
    title: 'Seven worlds around one dim star',
    description: 'Move through the TRAPPIST-1 family. Every sibling is a catalogue entry; every portrait makes its evidence and invention visible.',
    planetNames: ['TRAPPIST-1 b', 'TRAPPIST-1 c', 'TRAPPIST-1 d', 'TRAPPIST-1 e', 'TRAPPIST-1 f', 'TRAPPIST-1 g', 'TRAPPIST-1 h'],
  },
  {
    id: 'short-years',
    title: 'When a year lasts less than a day',
    description: 'Three archive-reported orbital periods, each shorter than one Earth day. The hours are simple conversions, not simulated calendars.',
    planetNames: ['55 Cnc e', 'Kepler-10 b', 'WASP-18 b'],
  },
  {
    id: 'discovery-methods',
    title: 'Three ways to find a world',
    description: 'A transit, a stellar wobble, and a direct image reveal different evidence. Compare what each catalogue record can—and cannot—say.',
    planetNames: ['TRAPPIST-1 e', '51 Peg b', 'HD 95086 b'],
  },
];

export function journeyWorlds(catalogue: Catalogue, journey: CuratedJourney): PlanetRow[] {
  return journey.planetNames.map((name) => catalogue.byName.get(name)).filter((planet): planet is PlanetRow => Boolean(planet));
}

function number(value: number, digits = 2): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: digits });
}

export function wonderFor(planet: PlanetRow): { summary: string; facts: WonderFact[] } {
  const world = generateWorld(planet);
  const gravity = derivedGravity(planet);
  const facts: WonderFact[] = [];
  if (planet.pl_orbper !== null) {
    facts.push({
      label: 'A local year',
      value: planet.pl_orbper < 2 ? `${number(planet.pl_orbper * 24, 1)} Earth hours` : `${formatValue(planet.pl_orbper, 'Earth days')}`,
      explanation: planet.pl_orbper < 1 ? 'The archive reports an orbital period shorter than one Earth day.' : 'One complete orbit around its host star, from the archive-reported period.',
      status: planet.pl_orbper < 2 ? 'DERIVED' : 'MEASURED',
    });
  }
  if (gravity !== null) {
    facts.push({
      label: 'Surface gravity',
      value: `${number(gravity / 9.80665)} × Earth`,
      explanation: `${number(gravity)} m/s², calculated from archive mass and radius. This says nothing by itself about habitability.`,
      status: 'DERIVED',
    });
  } else if (planet.pl_rade !== null) {
    facts.push({
      label: 'Relative size',
      value: `${number(planet.pl_rade)} × Earth’s radius`,
      explanation: 'An archive-reported radius. The portrait’s surface details remain artistic reconstruction.',
      status: 'MEASURED',
    });
  }
  if (planet.pl_insol !== null) {
    facts.push({
      label: 'Received starlight',
      value: `${number(planet.pl_insol)} × Earth`,
      explanation: 'Archive-reported insolation relative to Earth, not a weather forecast or surface-temperature reading.',
      status: 'MEASURED',
    });
  }
  if (!facts.length) {
    facts.push({
      label: 'The honest answer',
      value: 'Much remains unknown',
      explanation: 'This row has no usable period, radius, mass, or insolation narrative. Missing values are not replaced with inventions.',
      status: 'MEASURED',
    });
  }
  return {
    summary: `${planet.pl_name} is catalogued in the ${planet.hostname} system. Its ${world.kindLabel.toLowerCase()} label is a transparent visualization class, not an official taxonomy.`,
    facts: facts.slice(0, 3),
  };
}
