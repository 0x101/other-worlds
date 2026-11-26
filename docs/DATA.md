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

### Composite-table caveat

`pscomppars` supplies one row per planet with comparatively complete values that may come from different references. A row is **not necessarily a self-consistent or homogeneous published solution**. The inspector repeats this caveat. `pl_bmasse` is the archive best-mass field and may represent mass, an inclination-corrected mass, or `M sin(i)` according to `pl_bmassprov`; it is not silently described as a direct mass measurement in every case.

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

- **Surface gravity:** `9.80665 × pl_bmasse / pl_rade²` m/s², only when both values exist. This is not a habitability claim.
- **World class:** app-only thresholds: gas giant if radius ≥ 5.5 R⊕ or mass ≥ 100 M⊕; otherwise ice giant if radius ≥ 3.1 R⊕ or mass ≥ 30 M⊕; otherwise sub-Neptune if radius ≥ 1.8 R⊕; otherwise rocky when radius < 1.8 R⊕ or mass < 30 M⊕; otherwise unknown. These are visualization categories, not official NASA classes.
- **Orbit radius:** measured au is compressed as `clamp(3.8 + ln(1 + au) × 5, 4, 24)` scene units. If au is missing but period and host mass exist, a Kepler estimate `a = (M × P_years²)^(1/3)` is labeled DERIVED.
- **Planet display scale:** bounded cube-root radius scaling preserves influence without implying a to-scale body.

### IMAGINED

- Terrain, clouds, bands, palette variation, atmospheric thickness/color, and axial tilt are deterministic artistic reconstruction from the FNV-1a hash of `pl_name` and a seeded PRNG.
- Orbital phase and system orientation are illustrative, not positions for a date. If no orbital scale can be calculated, index-spaced radii are labeled IMAGINED.
- Atlas distance is logarithmically compressed. For the 28 rows lacking distance, an atlas-only radial shell is used and `skyPosition` marks it IMAGINED; no parsec value is fabricated. The same rule applies to missing direction fields, although this snapshot has complete RA/Dec.
- Filters named `Rocky` and `Gas & ice giants` use the DERIVED class thresholds; `180–320 K` is an explicit archive-temperature filter, not a habitability label.
