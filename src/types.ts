export type ViewName = 'earth' | 'solar' | 'neighbourhood' | 'atlas' | 'system' | 'planet' | 'lookback';
export type FilterName = 'all' | 'rocky' | 'giants' | 'temperate' | 'transiting' | 'nearby';

export interface PlanetRow {
  pl_name: string;
  hostname: string;
  sy_pnum: number | null;
  sy_snum: number | null;
  cb_flag: number | null;
  pl_rade: number | null;
  pl_bmasse: number | null;
  pl_bmassprov: string | null;
  pl_dens: number | null;
  pl_orbper: number | null;
  pl_orbsmax: number | null;
  pl_orbeccen: number | null;
  pl_eqt: number | null;
  pl_insol: number | null;
  st_teff: number | null;
  st_rad: number | null;
  st_mass: number | null;
  st_spectype: string | null;
  st_lum: number | null;
  disc_year: number | null;
  discoverymethod: string | null;
  disc_facility: string | null;
  disc_refname: string | null;
  ra: number | null;
  dec: number | null;
  sy_dist: number | null;
  pl_controv_flag: number | null;
  tran_flag: number | null;
  rv_flag: number | null;
  ttv_flag: number | null;
  pul_flag: number | null;
  ptv_flag: number | null;
  ast_flag: number | null;
  obm_flag: number | null;
  micro_flag: number | null;
  etv_flag: number | null;
  ima_flag: number | null;
  dkin_flag: number | null;
}

export interface Catalogue {
  planets: PlanetRow[];
  byName: Map<string, PlanetRow>;
  systems: Map<string, PlanetRow[]>;
}

export type TraceableField = 'pl_rade' | 'pl_bmasse' | 'pl_dens' | 'pl_orbper' | 'pl_orbsmax' | 'pl_orbeccen' | 'pl_eqt' | 'pl_insol' | 'st_teff' | 'st_rad' | 'st_mass' | 'st_lum' | 'sy_dist';

export interface SourceReference {
  label: string;
  url: string | null;
  raw: string;
}

export interface SourceMeasurement {
  value: number | null;
  positiveError: number | null;
  negativeError: number | null;
  limit: number | null;
  reference: SourceReference | null;
}

export interface TraceabilityRow {
  pl_name: string;
  hostname: string;
  measurements: Record<TraceableField, SourceMeasurement>;
  discoveryReference: SourceReference | null;
  telescope: string | null;
  instrument: string | null;
  locale: string | null;
  raw: Record<string, string | number | null>;
}

export interface TraceabilityCatalogue {
  rows: TraceabilityRow[];
  byName: Map<string, TraceabilityRow>;
}

export interface Provenance {
  title: string;
  sourceUrl: string;
  requestUrl: string;
  query: string;
  fetchedAt: string;
  rowCount: number;
  uniquePlanetCount: number;
  uniqueSystemCount: number;
  missing: Record<string, number>;
  missingValuePolicy: string;
  compositeCaveat: string;
  attribution: string;
}

export interface CameraViewState {
  azimuth: number;
  elevation: number;
}

export type ExperienceName = 'wonder' | 'observatory';
export type ShareTemplate = 'portrait' | 'field-note' | 'orbital-study';
export type JourneyOrigin = 'atlas' | 'neighbourhood';

export interface JourneyState {
  view: ViewName;
  planetName: string | null;
  origin: JourneyOrigin;
  filter: FilterName;
  query: string;
  experience: ExperienceName;
  evidenceOpen: boolean;
  camera: CameraViewState;
  shareTemplate: ShareTemplate | null;
}

export type EvidenceStatus = 'MEASURED' | 'DERIVED' | 'IMAGINED';

export interface EvidenceItem {
  label: string;
  value: string;
  status: EvidenceStatus;
  source: string;
  note?: string;
  reference?: SourceReference | null;
}

export type WorldKind = 'rocky' | 'sub-neptune' | 'ice-giant' | 'gas-giant' | 'unknown';
export type SurfaceKind = 'terrain' | 'clouds' | 'bands' | 'ice-bands';

export interface WorldRecipe {
  seed: number;
  kind: WorldKind;
  kindLabel: string;
  surface: SurfaceKind;
  palette: [string, string, string];
  atmosphereColor: string;
  atmosphereStrength: number;
  displayRadius: number;
  illumination: number;
  starColor: string;
  noiseScale: number;
  bandCount: number;
  axialTilt: number;
  rotationSeconds: number;
  temperatureBand: string;
  paletteVariant: number;
  cloudCover: number;
  relief: number;
  storminess: number;
  heat: number;
}
