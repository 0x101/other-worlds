# Validation results

Golden-path production-preview validation completed on `2026-11-26`. The machine-readable sources of truth are `evidence/browser-report.json`, `evidence/data-report.json`, and the reference-capture manifests. Listed screenshots and PNG exports are committed browser output, not design mockups.

## Automated checks

- **Unit/logic:** 11 test files, **56/56 tests passed** with Vitest.
  - Earth-first/default URLs, Explore, all golden-path stops, journey origin, selected-world look-back/resume, camera state, malformed input, Share templates, and legacy migration.
  - Fixed Solar System epoch, eight finite heliocentric positions, source EQJ and display ECL/J2000 frame contracts, logarithmic display radii, bounded real nearby hosts, and no fabricated look-back geometry.
  - Gaia schema and J2016.0 / TCB contracts, exact string source IDs, quality gates, ordered geometric-distance intervals, logarithmic positions, and deterministic display colour.
  - Catalogue parsing, duplicate identifiers, null handling, search, filters, deterministic generation, source-parameter influence, gravity, evidence, traceability, raw exports, Wonder, fingerprints, and Share mappings.
- **Loaded data integrity:** the browser loaded 6,473 real planets in 4,865 systems and matched both NASA snapshot row counts. The preserved data audit records 6,473 unique planet identifiers, base SHA-256 `6bcd8b57…cb362`, **84,149** base/companion measurement comparisons, and **440,164** raw/normalized cell comparisons across 2,321 shared publication references. It also rebuilt and exactly matched all **384** Gaia runtime rows against the raw CSV, with 384 unique string IDs, raw SHA-256 `b61bb8e0…de96b8b257dc`, and published median distances from 1.8281064 to 14.2755337 pc.
- **Production build:** TypeScript `--noEmit` and Vite build passed. The main bundle is **1,067.83 kB** minified (**291.90 kB gzip**), CSS is **41.18 kB** (**8.30 kB gzip**), and the QR browser chunk is **25.84 kB** (**10.14 kB gzip**). Vite's large-chunk warning remains documented rather than suppressed.

## Real-browser release gate

Playwright Chromium passed **102/102 checks against the development server and again against production `dist/`**, including:

- Cold start on Earth, explicit You Are Here context, Leave Earth, fixed-epoch eight-planet Solar System, Gaia DR3 neighbourhood with 96-host NASA overlay, TRAPPIST-1 system, planet approach, schematic look-back, portrait resume, and return home without recreating the renderer.
- A projected-coordinate click on an actual WebGL Gaia point opening source `1926461164913660160`; an exact-ID audit exposing all 384 sources; and Barnard's Star retaining source ID `4472832130942575872`, parallax `546.976 ± 0.040 mas`, and the distinct published interval `1.8280–1.8282` pc.
- Desktop and mobile method sheets staying inside the viewport and clear of the primary course action, with explicit mobile dismissal; selection closing the sheet without losing the source inspector.
- Explore opening the complete atlas, atlas/system/planet/evidence/Share deep links, origin-aware back navigation, search/filter/empty recovery, and legacy world-link normalization.
- Three curated journeys, seven real TRAPPIST-1 stops, keyboard focus containment, and trigger-focus restoration.
- Seven real sibling controls, source-field labels, asymmetric uncertainty, publication link, DERIVED calculation, IMAGINED disclaimer, and actual raw JSON/CSV downloads.
- Direct world-camera drag updating `az`/`el`, with reload reopening identical world/camera state.
- Share PNG failure/retry, exactly three finished templates, actual previews, exact-link copying/reopening, high-resolution PNG downloads, Escape dismissal, and focus restoration.
- Mobile Earth → Gaia neighbourhood/source → Explore → K2-18 system → planet → Share/evidence, no page overflow, fixed back navigation, 44 px+ actions, and geometric non-overlap of the inspector, method sheet, field guide, look-back/Share row, and primary actions.
- 768 px and 1024 px atlas layouts; reduced-motion Solar System, Gaia neighbourhood, and gas-giant/Share behavior; no-WebGL Earth → Solar System → all-384-source Gaia neighbourhood/source inspector and static planet/evidence/Orbital Study export; catalogue failure/retry on Earth.
- **Zero uncaught page errors, zero unexpected console errors, and zero failed HTTP responses.** Three.js's expected context-creation diagnostic in the deliberately no-WebGL context is excluded from the normal-journey console gate. The deliberately aborted catalogue request is isolated in its error context.
- The validation server and its descendants stopped after each completed run.

## Actual PNG downloads

| Template | Filename | Dimensions | Bytes | Result |
|---|---|---:|---:|---|
| Portrait | `trappist-1-e-portrait.png` | 1800 × 2250 | 2,748,575 | PNG signature, dimensions, nonempty content, exact link, preview, and download passed |
| Field Note | `trappist-1-e-field-note.png` | 2400 × 1800 | 1,123,616 | PNG signature, dimensions, nonempty content, exact link, preview, and download passed |
| Orbital Study | `trappist-1-e-orbital-study.png` | 2200 × 2200 | 544,824 | PNG signature, dimensions, nonempty content, exact link, preview, and download passed |

Reduced-motion separately downloaded a nonempty 2400 × 1800 Field Note (1,176,968 bytes), and the no-WebGL context separately downloaded a nonempty 2200 × 2200 Orbital Study (542,832 bytes). File existence alone was not used as visual validation.

## Responsive and visual evidence

The golden-path run opened and inspected these browser captures:

| Capture | Viewport/output | Visually checked |
|---|---|---|
| `desktop-earth.png` | 1440 × 960 | Textured Earth, atmosphere, You Are Here frame, departure and Explore controls, composite disclosure; no black canvas |
| `desktop-solar.png` | 1440 × 960 | Eight-body model, Sun, distance guides, Earth marker, fixed epoch and frame disclosures |
| `desktop-neighbourhood.png` | 1440 × 960 | Real Gaia field and larger host lights, narrative and TRAPPIST-1 action, J2016.0/incompleteness disclosure; no black canvas |
| `desktop-gaia-method.png` | 1440 × 960 | Bounded side sheet, complete method copy, exact-source selector, source links and close control; no clipping or journey-control overlap |
| `desktop-gaia-source.png` | 1440 × 960 | Barnard's Star identity, distinct four-decimal distance interval, parallax/error, photometry, quality and frame labels |
| `desktop-neighbourhood-reduced-motion.png` | 1280 × 800 | Complete Gaia/host scene and controls with transition/animation removal |
| `desktop-static-neighbourhood.png` | 1280 × 800 | All-source static SVG reconstruction, visible host overlay, no-WebGL notice, and retained journey controls |
| `desktop-lookback.png` | 1440 × 960 | Home direction/marker, unresolved-Earth and schematic labels, resume and return actions |
| `desktop-atlas.png` | 1440 × 960 | Real-system field, snapshot wording, search/filter dock and Explore return |
| `desktop-system.png` | 1440 × 960 | Orrery, seven-world fingerprint, sibling rail, approach action |
| `desktop-planet.png` | 1440 × 960 | Rocky portrait, field guide, evidence and look-back/Share actions |
| `desktop-solar-reduced-motion.png` | 1280 × 800 | Solar System with transition/animation removal |
| `desktop-static-earth.png` | 1280 × 800 | Still Earth composite and available journey controls without WebGL |
| `mobile-earth.png` | 375 × 812 | Earth-first opening, readable departure and Explore actions, no page overflow |
| `mobile-neighbourhood.png` | 375 × 812 | Gaia narrative, real star field, separated course/atlas/method controls, and readable frame disclosures |
| `mobile-gaia-method.png` | 375 × 812 | Viewport-bounded method sheet below the course action, 44 px close target, selector and source links |
| `mobile-gaia-source.png` | 375 × 812 | Inspector below the course action, readable exact ID, distinct uncertainty bounds, and no page overflow |
| `mobile-atlas.png` | 375 × 812 | Explore narration, snapshot disclosure, search/filter access |
| `mobile-planet.png` | 375 × 812 | Atmospheric portrait, fixed back link, field guide, separated look-back/Share row and 52 px primary action |

The remaining browser report also records desktop evidence/Share, mobile Share/evidence, gas giant, static planet/Share, and responsive atlas checks. Earlier review rounds inspected the finished Share exports and corrected a no-WebGL notice/Share collision and Field Note footer contrast; those historical findings are retained in `evidence/round-1/` through `round-4/` and the committed reports.

The mobile visual pass identified nested absolute positioning that collapsed look-back and Share into the field guide. The fix resets the nested controls to normal flex items, gives the row a bounded full-width position, and preserves an actual gap to the primary action. A bounding-rectangle regression check now fails on overlap even when the controls are technically visible.

The Gaia visual pass found three concrete defects: three-decimal formatting collapsed Barnard's narrow distance interval; the mobile inspector initially covered the course action; and a transformed animated ancestor made the fixed method sheet relative to the narrative copy, causing mobile overlap and desktop clipping. Four-decimal interval display, compact bounded inspector geometry, an explicit method-sheet close button, and removal of that ancestor transform animation resolved them. Browser geometry assertions cover the responsive fixes.

## Performance observations

This production software-Chromium sample reported:

| View | FPS | Draw calls | Triangles |
|---|---:|---:|---:|
| Earth | 32 | 2 | 20,896 |
| Solar System | 34 | 19 | 14,754 |
| Gaia neighbourhood + host overlay | 60 | 3 | 2 |
| Look-back | 60 | 3 | 722 |
| Atlas | 60 | 6 | 2 |
| TRAPPIST-1 e portrait | 24 | 4 | 26,498 |

The atlas sample recorded 13 resource entries and 2,280,993 transfer bytes after starting at Earth. These are diagnostic observations from one headless software-rendered environment, **not physical-device frame-rate or network benchmarks**. The raw base JSON snapshot is approximately 4.8 MiB on disk.

## Known limitations

- **The Gaia layer is a bounded sample, not a complete census.** Its 384 bright, high-confidence sources are selected by parallax, quality, and row limit. The 96-host NASA overlay is independent, not a Gaia crossmatch. No proper-motion epoch propagation or parallax zero-point correction is applied, and Gaia source selection is transient rather than URL-encoded.
- The Solar System is a fixed-epoch geometric model without user time controls, satellite positions, light-time correction, or aberration correction.
- Exoplanet surfaces, cloud patterns, atmospheric appearance, orbital phases, and inclinations are illustrative. This is not an observed exoplanet surface map or exoplanet ephemeris.
- Atlas, neighbourhood, look-back, and orbital scales are compressed; missing atlas distances use a labeled illustrative shell. `pscomppars` values can come from different references.
- World classes are transparent visualization heuristics, not official taxonomy or habitability assessments. Unknown values remain omitted or explicitly unknown.
- Physical iOS/Android devices, Safari, and screen readers were not verified. Keyboard operation, focus restoration, reduced motion, DOM alternatives, blocked-clipboard recovery, and Chromium touch-sized layouts were verified.
- The static export and no-WebGL portrait are intentionally simpler than the shader portrait; both use the same world identity, recipe, evidence, camera state, and provenance.
- Three.js ships in the initial bundle; lazy loading and physical-device performance tuning remain technical hardening work.
- No live catalogue auto-refresh, account persistence, native-device sharing enhancement, or public deployment is included. No agent-started validation server remains; an independently owned original-copy preview is not touched by this project.
