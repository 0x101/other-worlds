# Data provenance and evidence rules

## Source and snapshot

- **Publisher:** NASA Exoplanet Archive, operated by Caltech under contract with NASA.
- **Table:** Planetary Systems Composite Parameters, `pscomppars`.
- **Endpoint:** `https://exoplanetarchive.ipac.caltech.edu/TAP/sync`
- **Fetched at:** `2026-11-26T05:39:40.440Z`.
- **Result:** 6,473 rows; 6,473 unique planet identifiers; 4,865 unique host names.
- **Exact SQL:** `data-query.sql` and `public/data/provenance.json`.
- **Raw response:** `public/data/pscomppars.json`, stored as the returned JSON array without synthetic rows.
- **Documentation:** https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html and https://exoplanetarchive.ipac.caltech.edu/docs/API_PS_columns.html

The full request succeeded; no bounded fallback subset was needed. No API key was used. The 4.8 MiB raw snapshot is committed once and used directly by the app, avoiding a second derived catalogue copy.

### Traceability companion

A second, non-destructive `pscomppars` request adds uncertainties (`*err1`, `*err2`), limit flags (`*lim`), per-parameter publication links (`*_reflink`), and discovery telescope/instrument/locale fields for 13 numeric measurements. The original base response and its provenance are unchanged; `scripts/validate-data.mjs` enforces the base SHA-256 and exact one-to-one identity, host, and source-value agreement.

- **Exact query:** `traceability-query.sql` and `public/data/traceability-provenance.json`.
- **Raw response:** `data/raw/pscomppars-traceability.json` (not shipped in `dist/`).
- **Runtime response:** `public/data/pscomppars-traceability.json`, schema `other-worlds/pscomppars-traceability-v1`.
- **Counts:** 6,473 rows, 6,473 unique planets, 4,865 systems, 2,321 shared publication-reference strings.
- **Normalization:** rows are arrays in the provenance `fields` order. Reference fields contain zero-based indexes into the shared `references` array. Null stays null. The validator compares every normalized cell with the raw response.
- **Publication links:** the archive's anchor-formatted `reflink` values are parsed into text and an HTTPS URL. They are never inserted as HTML. Fields without a companion reference remain explicitly without a per-parameter reference rather than borrowing another field's citation.

Limit flags are shown as archive-reported upper/lower-limit metadata. Uncertainties retain separate positive and negative values. Missing errors, limits, or references are not inferred. Raw JSON and CSV exports merge the preserved base row with its companion fields and include both exact queries and fetch timestamps; no derived or artistic values are presented as raw source measurements.

### Composite-table caveat

`pscomppars` supplies one row per planet with comparatively complete values that may come from different references. A row is **not necessarily a self-consistent or homogeneous published solution**. The inspector repeats this caveat. `pl_bmasse` is the archive best-mass field and may represent mass, an inclination-corrected mass, or `M sin(i)` according to `pl_bmassprov`; it is not silently described as a direct mass measurement in every case.

## Golden-path data

### Earth composite

`public/textures/earth-blue-marble.jpg` is the NASA Blue Marble Earth composite packaged with the pinned Three.js `r180` examples. It was retrieved from `https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/textures/planets/earth_atmos_2048.jpg` and is served locally. It is composite imagery, not a live cloud view or an observed current surface. The exoplanet portraits remain procedural and are not represented as observed surfaces.

### Archived ISS expedition

`data/raw/iss-omm.json` preserves one CelesTrak general-perturbations response for ISS (ZARYA), international designator `1998-067A`, NORAD catalogue ID `25544`. The exact request is `https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=json-pretty`; the response is SGP4 mean-element data in Orbit Mean-Elements Message JSON semantics. CelesTrak's GP documentation supplies the omitted common OMM defaults: Earth centre, TEME frame, UTC time system, and SGP4 theory. Documentation: https://celestrak.org/NORAD/documentation/gp-data-formats.php and https://celestrak.org/NORAD/documentation/gp-data-requests.php.

- **Preservation and identity:** raw SHA-256 `c624f089e59c598a1355cf34f3f6e5030262ee7f6c9d770186dfea6788bf46be`; local preservation recorded at `2026-11-27T19:21:43.000Z`, explicitly not an upstream HTTP-header timestamp. Exact source epoch is `2026-11-27T09:29:25.185696Z`; the millisecond selection is `2026-11-27T09:29:25.185Z`. The source was **9 h 52 min old when preserved**, a historical age rather than a current staleness or accuracy claim.
- **Propagation:** exactly pinned satellite.js 7.2.0 (MIT) supplies `json2satrec` and `propagate`; no orbital algorithm is reimplemented. Its 7.2.0 change log specifically fixes OMM microsecond-epoch retention. The preserved source reference is Earth-centred TEME `[-5736.73520774008, -3641.675924088093, -0.00677716437]` km, geocentric distance `6794.993331847605 km`, with no light-time correction or numeric uncertainty estimate.
- **Time contract:** manual previous/next steps are 10 minutes inside `2026-11-26T21:29:25.185Z` through `2026-11-27T21:29:25.185Z`, with source-epoch reset. The ±12 h interaction bound is not an accuracy guarantee. Invalid or out-of-window exact links fail closed to the source epoch; leaving Earth removes ISS URL state. No playback, visitor-clock fallback, or runtime CelesTrak request exists.
- **Trace and display:** 47 local SGP4 samples at two-minute spacing cover 92 minutes near the selection and are clamped at the interaction boundaries. Display preserves TEME direction using `(x,z,−y)` but fixes trace radius at `2.65` scene units around Earth radius `2`; radial separation is exaggerated. The phone layout applies one uniform display-only scale to Earth, atmosphere, trace, and marker, preserving their ratio without changing the camera or source vectors. Earth's composite texture is not time-registered. No ground track, visibility, pointing, or observed-surface claim is made.
- **Offline rebuild:** `npm run data:iss` validates the preserved raw OMM and deterministically rebuilds `src/data/iss-expedition.json`. It does **not** fetch or refresh CelesTrak. `npm run data:validate` independently verifies raw/manifest equality, hash, source semantics, reference propagation, bounds, and changed-time geometry.

### Solar System reference snapshot and selected epochs

`src/data/solar-system.json` is schema `other-worlds/solar-system-snapshot-v1`, generated by `npm run data:solar` with Astronomy Engine 2.1.19. It preserves the eight planet centres at reference epoch `2026-11-26T00:00:00.000Z`; the default view does not read the visitor's clock and is not live telemetry.

- `HelioVector` supplies geometric heliocentric planet-centre positions in au, EQJ/J2000 mean-equator coordinates. `src/lib/goldenPath.ts` applies the same pinned runtime method at a selected epoch.
- The explicit product window is `2000-01-01T00:00:00.000Z` through `2100-01-01T00:00:00.000Z`. URL input fails closed to the reference epoch; date controls choose midnight UTC. This is a declared interaction bound, not a separate accuracy guarantee.
- Input is an explicit UTC instant. Astronomy Engine documents that it approximates UT1 and UTC as equivalent and derives TT internally; this slice exposes no independent ephemeris uncertainty estimate.
- Original EQJ vectors, heliocentric distances, generator version, generation time, and method are retained for the reference snapshot. Selected epochs retain both computed vectors in the pure data path and still-fallback attributes.
- `RotateVector(Rotation_EQJ_ECL())` supplies ECL/J2000 display coordinates. The visible frame label names this display transformation; source EQJ and display ECL semantics are not conflated.
- Previous/next-day controls and date selection pause playback. Optional playback advances six model hours per 250 ms update (one model day per nominal second), never the system clock. Reduced motion removes playback and retains manual stepping.
- This eight-planet Solar System model includes no satellites or major moons and applies no light-time or aberration correction. The separate Earth-anchored ISS expedition above does not add satellites to this Solar model.
- Display radius is `3.8 + ln(1 + au) × 6.2` scene units. Body glyphs are enlarged and rings are guides, not complete orbital paths. Epoch changes update existing meshes/rings without recreating the renderer or moving the camera.

### Gaia DR3 neighbourhood, NASA host overlay, and look-back

The neighbourhood's stellar layer is a bounded, quality-filtered Gaia DR3 snapshot, not a random starfield or a complete census.

- **Publisher and access:** ESA Gaia data processed by DPAC, retrieved through the ARI Gaia Archive partner TAP endpoint `https://gaia.ari.uni-heidelberg.de/tap/sync` at `2026-11-27T00:33:19.000Z`.
- **Preserved evidence:** `data/raw/gaia-dr3-neighbourhood.csv` is the raw CSV response, SHA-256 `b61bb8e0d0f5ab33117e29959471fee7bb608981efc410da3e42de96b8b257dc`. `gaia-dr3-neighbourhood-query.sql` and the runtime manifest retain the exact ADQL. `src/data/gaia-neighbourhood.json` records endpoint, retrieval time, source tables, units, epoch, frame, origin, transformations, and all 384 rows.
- **Selection:** the largest-parallax 384 rows inside a 50 mas / 20 pc gate, with parallax S/N ≥ 20, RUWE ≤ 1.4, at least 10 visibility periods, five-parameter solution 31, G ≤ 12, non-null BP−RP and proper motions, and valid ordered distance intervals. Ordering is descending parallax with exact source ID as the tie-breaker. Brightness, quality, and row-limit selections preclude a completeness claim.
- **Identity and astrometry:** Gaia source IDs remain exact decimal strings. DR3 retains the EDR3 astrometry and source list. Directions are ICRS-aligned at J2016.0 / TCB; no proper-motion propagation or parallax zero-point correction is applied.
- **Distance:** `gaiaedr3_complements.distances` supplies Bailer–Jones et al. (2021) geometric posterior medians (`r_med_geo`) and 16th/84th-percentile bounds (`r_lo_geo`, `r_hi_geo`) in parsecs. The inspector displays the published median and interval, never a naive `1000 / parallax` replacement. The reference is https://doi.org/10.3847/1538-3881/abd806.
- **Display transform:** direction is `(cos(dec)cos(ra), sin(dec), cos(dec)sin(ra))`; radius is `5 + log10(r_med_geo + 1) × 13` scene units. BP−RP alone drives the disclosed display colour ramp; G is retained for selection and inspection. These are visual encodings, not resolved stellar images or physical scene distances.

An independent overlay selects the 96 nearest unique NASA exoplanet hosts having complete RA/Dec and a positive finite `sy_dist`. Direction and parsec distance come from the preserved NASA snapshot; display radius is `5 + log10(distancePc + 1) × 13`. Rows with missing or invalid geometry are excluded, never assigned a default distance. The larger host lights are not represented as a Gaia crossmatch and retain system-picking priority. Every Gaia point also has an exact-ID DOM selector and an inspector for distance, parallax/error, photometry, RUWE, visibility, epoch, time scale, and frame.

Look-back places the observer along the selected host's archive direction, facing the Sun at the local origin. The archive distance remains available in parsecs, but the display distance is compressed. Earth is unresolved and the scene is a schematic direction home, not an observed view. Missing geometry disables the action with an explanation.

## Field mapping

| Product concept | NASA source fields | Treatment |
|---|---|---|
| Planet and host identity | `pl_name`, `hostname` | Required non-empty strings; duplicate planet names rejected |
| System composition | `sy_pnum`, `sy_snum`, `cb_flag` | Source values; sibling list grouped by `hostname` |
| Radius, mass, density | `pl_rade`, `pl_bmasse`, `pl_bmassprov`, `pl_dens` | Earth units / g cm⁻³; mass provenance shown |
| Orbit | `pl_orbper`, `pl_orbsmax`, `pl_orbeccen` | Days, au, dimensionless |
| Energy environment | `pl_eqt`, `pl_insol` | Kelvin and Earth flux; equilibrium temperature is a modeled source value |
| Host | `st_teff`, `st_rad`, `st_mass`, `st_spectype`, `st_lum` | Kelvin, solar units, spectral label, log solar luminosity |
| Discovery | `disc_year`, `discoverymethod`, `disc_facility`, `disc_refname` | Source metadata; reference retained in raw snapshot |
| Sky and distance | `ra`, `dec`, `sy_dist` | Decimal degrees and parsecs |
| Status and detections | `pl_controv_flag`, `tran_flag`, `rv_flag`, `ttv_flag`, `pul_flag`, `ptv_flag`, `ast_flag`, `obm_flag`, `micro_flag`, `etv_flag`, `ima_flag`, `dkin_flag` | Positive flags shown as labels; controversial/circumbinary status exposed |

## Missing values

NASA `null` remains JavaScript `null`, renders as `Unknown`, and never becomes zero. Filters requiring a value exclude unknowns. Calculations requiring multiple values return `Unknown` if any input is missing.

Selected missing counts in this snapshot: radius 50; mass 31; density 146; orbital period 358; semi-major axis 499; eccentricity 1,072; equilibrium temperature 542; insolation 598; host effective temperature 311; host spectral type 4,046; system distance 28. The complete per-field record is in `provenance.json`.

## MEASURED / DERIVED / IMAGINED contract

### MEASURED

The label means **archive-reported source field**, not necessarily a direct instrument reading. Each item names its `pscomppars` column. Original sources may themselves model values, notably equilibrium temperature and composite mass. Other Worlds does not add uncertainty, provenance, or precision that is absent from the snapshot.

### DERIVED

- **ISS position:** satellite.js SGP4 propagation of one preserved CelesTrak OMM at an explicit historical UTC instant, in Earth-centred TEME kilometres. The interface and manifest distinguish this derivation from the source elements and from any live observation; radial display scaling is separately disclosed and does not alter the retained vector.
- **Surface gravity:** `9.80665 × pl_bmasse / pl_rade²` m/s², only when both values exist. This is not a habitability claim.
- **World class:** app-only thresholds: gas giant if radius ≥ 5.5 R⊕ or mass ≥ 100 M⊕; otherwise ice giant if radius ≥ 3.1 R⊕ or mass ≥ 30 M⊕; otherwise sub-Neptune if radius ≥ 1.8 R⊕; otherwise rocky when radius < 1.8 R⊕ or mass < 30 M⊕; otherwise unknown. These are visualization categories, not official NASA classes.
- **Orbit radius:** measured au is compressed as `clamp(3.8 + ln(1 + au) × 5, 4, 24)` scene units. If au is missing but period and host mass exist, a Kepler estimate `a = (M × P_years²)^(1/3)` is labeled DERIVED.
- **Planet display scale:** bounded cube-root radius scaling preserves influence without implying a to-scale body.

### IMAGINED

- Terrain, clouds, bands, palette variation, atmospheric thickness/color, and axial tilt are deterministic artistic reconstruction from the FNV-1a hash of `pl_name` and a seeded PRNG.
- Orbital phase and system orientation are illustrative, not positions for a date. If no orbital scale can be calculated, index-spaced radii are labeled IMAGINED.
- Atlas distance is logarithmically compressed. For the 28 rows lacking distance, an atlas-only radial shell is used and `skyPosition` marks it IMAGINED; no parsec value is fabricated. The same rule applies to missing direction fields, although this snapshot has complete RA/Dec.
- Filters named `Rocky` and `Gas & ice giants` use the DERIVED class thresholds; `180–320 K` is an explicit archive-temperature filter, not a habitability label.
