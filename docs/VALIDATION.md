# Validation results

Golden-path production-preview validation completed on `2026-11-27`. The machine-readable sources of truth are `evidence/browser-report.json`, `evidence/data-report.json`, and the reference-capture manifests. Listed screenshots and PNG exports are committed browser output, not design mockups.

## Automated checks

- **Unit/logic:** 17 test files, **77/77 tests passed** with Vitest.
  - Earth-first/default URLs, Explore, all golden-path stops, journey origin, selected-world look-back/resume, camera state, malformed input, Share templates, and legacy migration.
  - ISS strict millisecond ISO UTC parsing, source-epoch fallback, ±12 h bounds, clamped ten-minute steps, exact reference TEME vector/geocentric distance, changed-time propagation, 47-point trace bounds, formatting, component controls, exact-link state, and non-Earth cleanup.
  - Moon strict ISO UTC parsing, reference-epoch fallback, ±24 h bounds, clamped three-hour steps, exact reference EQJ/ECL vectors and geocentric distance, changed-time derivation, 25-point trace bounds, one-active-expedition links, component controls, and non-Earth cleanup.
  - Selected Solar System epochs, strict ISO UTC parsing and fallback, bounded day/fractional-day steps, non-zero epoch seconds/milliseconds, invalid-date recovery, eight finite heliocentric positions, source EQJ and display ECL/J2000 frame contracts, logarithmic display radii, bounded real nearby hosts, and no fabricated look-back geometry.
  - Gaia schema and J2016.0 / TCB contracts, exact string source IDs, quality gates, ordered geometric-distance intervals, logarithmic positions, and deterministic display colour.
  - Catalogue parsing, duplicate identifiers, null handling, search, filters, deterministic generation, source-parameter influence, gravity, evidence, traceability, raw exports, Wonder, fingerprints, and Share mappings.
- **Loaded data integrity:** the browser loaded 6,473 real planets in 4,865 systems and matched both NASA snapshot row counts. The preserved data audit records 6,473 unique planet identifiers, base SHA-256 `6bcd8b57…cb362`, **84,149** base/companion measurement comparisons, and **440,164** raw/normalized cell comparisons across 2,321 shared publication references. It also rebuilt and exactly matched all **384** Gaia runtime rows against the raw CSV, with 384 unique string IDs, raw SHA-256 `b61bb8e0…de96b8b257dc`, and published median distances from 1.8281064 to 14.2755337 pc.
- **ISS data integrity:** satellite.js 7.2.0 independently matched the raw OMM/manifest elements, raw SHA-256 `c624f089…8bf46be`, exact source epoch `2026-11-27T09:29:25.185696Z`, reference Earth-centred TEME kilometre vector, and geocentric distance. A separate probe at `2026-11-27T09:39:25.185Z` verified changed-time derivation. The audit retains `historical: true`, `liveRefresh: false`, `lightTimeCorrection: false`, and `uncertainty: null`; the ±12 h selection bounds are not represented as an accuracy estimate.
- **Moon data integrity:** Astronomy Engine 2.1.19 independently regenerated the geometric geocentric reference at `2026-12-18T00:00:00.000Z` and exactly matched its retained 12-decimal EQJ/J2000 au and ECL/J2000 au vectors. The derived geocentric distance is `385514.9531405406 km`; a separate probe at `2026-12-18T03:00:00.000Z` verified changed-time derivation. Light-time and aberration corrections are false, uncertainty is null, and neither a surface nor a calculated phase is claimed.
- **Solar data integrity:** Astronomy Engine 2.1.19 independently regenerated all eight reference-epoch bodies and exactly matched their retained 12-decimal EQJ/J2000 au and ECL/J2000 au vectors. A separate Mercury probe at `2027-01-02T00:00:00.000Z` verified selected-epoch derivation. The declared UTC window is `2000-01-01T00:00:00.000Z` through `2100-01-01T00:00:00.000Z`; light-time and aberration corrections remain false in the audit.
- **Production build:** TypeScript `--noEmit` and Vite build passed. The main bundle is **1,159.56 kB** minified (**329.09 kB gzip**), CSS is **47.53 kB** (**9.17 kB gzip**), and the QR browser chunk is **25.84 kB** (**10.14 kB gzip**). Vite's large-chunk warning remains documented rather than suppressed.

## Real-browser release gate

Playwright Chromium passed **151/151 checks against the development server and again against production `dist/`**, including:

- Cold start on Earth with no unsolicited satellite tracker, explicit You Are Here context, Leave Earth, selected-epoch eight-planet Solar System, Gaia DR3 neighbourhood with 96-host NASA overlay, TRAPPIST-1 system, planet approach, schematic look-back, portrait resume, and return home without recreating the renderer.
- Meet the ISS opening the actual CelesTrak credit and source epoch; independent satellite.js reference vectors matching the WebGL marker within `1e-7` km; ten-minute stepping and exact-link reload; source/microsecond/historical-age/scale audit; reset and clean close. Canvas identity and camera coordinates remain unchanged across opening and stepping.
- Meet the Moon opening the pinned Astronomy Engine credit and reference epoch; independent `GeoMoon` EQJ/ECL reference vectors matching the WebGL marker; three-hour stepping and exact-link reload; reference/time-scale/display-compression/scientific-limits audit; reset and clean close. Canvas identity and camera coordinates remain unchanged across opening and stepping.
- Previous/next UTC day, play/pause, date selection, and reset; exact selected-epoch links surviving reload; redundant default epoch state removed from the URL; visible invalid-date drafts with same-date recovery; Astronomy Engine credited instead of the NASA exoplanet snapshot.
- Existing Solar planet meshes, guide rings, and Earth marker updating without recreating the renderer, controls, or camera. A post-orbit settled camera remained coherent across later epoch changes within the declared damping tolerance, with before/after coordinates recorded in the report.
- A projected-coordinate click on an actual WebGL Gaia point opening source `1926461164913660160`; an exact-ID audit exposing all 384 sources; and Barnard's Star retaining source ID `4472832130942575872`, parallax `546.976 ± 0.040 mas`, and the distinct published interval `1.8280–1.8282` pc.
- Desktop and mobile method sheets staying inside the viewport and clear of the primary course action, with explicit mobile dismissal; selection closing the sheet without losing the source inspector.
- Explore opening the complete atlas, atlas/system/planet/evidence/Share deep links, origin-aware back navigation, search/filter/empty recovery, and legacy world-link normalization.
- Three curated journeys, seven real TRAPPIST-1 stops, keyboard focus containment, and trigger-focus restoration.
- Seven real sibling controls, source-field labels, asymmetric uncertainty, publication link, DERIVED calculation, IMAGINED disclaimer, and actual raw JSON/CSV downloads.
- Direct world-camera drag updating `az`/`el`, with reload reopening identical world/camera state.
- Share PNG failure/retry, exactly three finished templates, actual previews, exact-link copying/reopening, high-resolution PNG downloads, Escape dismissal, and focus restoration.
- Mobile Earth → ISS ten-minute step/close → Moon three-hour step/close → Solar System/time step → Gaia neighbourhood/source → Explore → K2-18 system → planet → Share/evidence, no page overflow, fixed back navigation, 44 px+ actions, and geometric non-overlap of the ISS/Moon instruments, Earth narrative/departure/credit, Solar time panel, course action, planet rail, inspector, method sheet, field guide, look-back/Share row, and primary actions.
- 768 px and 1024 px atlas layouts; reduced-motion ISS and Moon with no playback or CSS animation plus retained explicit stepping, Solar System, Gaia neighbourhood, and gas-giant/Share behavior; no-WebGL Earth with independently checked static ISS TEME and Moon EQJ/ECL geometry and exact still labels → selected-epoch Solar System with updated retained EQJ vectors and honest still-view copy → all-384-source Gaia neighbourhood/source inspector and static planet/evidence/Orbital Study export; catalogue failure/retry on Earth.
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

After run 005's final production run, these five affected Moon captures were opened and visually inspected; the desktop instrument and expanded method were also inspected in native-resolution crops:

| Capture | Viewport/output | Visually checked |
|---|---|---|
| `desktop-earth-moon.png` | 1440 × 960 | Nonblack Earth, schematic Moon/ring, explicit selected instant, separated time/reset controls, readable native-resolution instrument text, and no collision |
| `desktop-earth-moon-method.png` | 1440 × 960 | Bounded method sheet, geometric `GeoMoon`/not-live disclosure, correction and uncertainty limits, and readable native-resolution provenance copy |
| `mobile-earth-moon.png` | 375 × 812 | Bounded instrument between the Earth narrative and imagery credit, 44 px time/close controls, intact schematic Moon/ring, no page overflow or control collision |
| `desktop-earth-moon-reduced-motion.png` | 1280 × 800 | No playback control, retained explicit three-hour stepping, selected instant, and complete nonblack scene |
| `desktop-static-earth-moon.png` | 1280 × 800 | Still Earth with equivalent derived SVG Moon/ring, explicit still-reconstruction status, no-WebGL notice, and retained journey controls |

The same production report also records ordinary Earth, Solar System, Gaia neighbourhood/source/method, look-back, atlas, system, planet, evidence/Share, gas-giant, responsive, and additional static captures. Earlier review rounds opened and inspected those affected states and retained their findings in `evidence/round-1/` through `round-4/` and the committed reports.

The mobile visual pass identified nested absolute positioning that collapsed look-back and Share into the field guide. The fix resets the nested controls to normal flex items, gives the row a bounded full-width position, and preserves an actual gap to the primary action. A bounding-rectangle regression check now fails on overlap even when the controls are technically visible.

The Gaia visual pass found three concrete defects: three-decimal formatting collapsed Barnard's narrow distance interval; the mobile inspector initially covered the course action; and a transformed animated ancestor made the fixed method sheet relative to the narrative copy, causing mobile overlap and desktop clipping. Four-decimal interval display, compact bounded inspector geometry, an explicit method-sheet close button, and removal of that ancestor transform animation resolved them. Browser geometry assertions cover the responsive fixes.

The Solar camera-continuity pass initially attributed post-drag movement to epoch updates. A targeted run-004 time series confirmed residual OrbitControls damping: the fixed 2.3 s wait could sample a still-moving pose, while the later epoch click changed an actually settled camera by less than 0.0001 scene units and left the target fixed. The regression now requires two consecutive diagnostic samples within 0.0001 units, polled at the diagnostic cadence with a bounded 15 s timeout, before changing epoch. It retains the existing 0.01-unit continuity tolerance rather than weakening the contract or resetting the camera.

The Solar date pass found that an invalid controlled input was immediately restored to the unchanged epoch, preventing a change event when the visitor reselected that same date. A separate draft now preserves the invalid attempt and permits deterministic recovery. The still fallback also replaces the inapplicable drag instruction with explicit still-view guidance. Component and browser regressions cover both behaviors; a browser assertion inspects the complete shared paragraph rather than searching for an exact element containing only its second line.

## Performance observations

The final production software-Chromium sample, validated at `2026-11-27T23:00:09.148Z`, reported:

| View | FPS | Draw calls | Triangles |
|---|---:|---:|---:|
| Earth | 24 | 2 | 20,896 |
| Earth + ISS expedition | 37 | 5 | 22,056 |
| Earth + Moon expedition | 25 | 5 | 22,728 |
| Solar System | 45 | 19 | 14,754 |
| Gaia neighbourhood + host overlay | 60 | 3 | 2 |
| Look-back | 59 | 3 | 722 |
| Atlas | 59 | 6 | 2 |
| TRAPPIST-1 e portrait | 22 | 4 | 26,498 |

The Earth sample recorded 12 resource entries and 2,318,762 transfer bytes; the separate atlas sampling window recorded 12 entries and 3,600 transfer bytes. These are diagnostic observations from one headless software-rendered environment, **not physical-device frame-rate or network benchmarks**. The raw base JSON snapshot is approximately 4.8 MiB on disk.

## Known limitations

- **The Gaia layer is a bounded sample, not a complete census.** Its 384 bright, high-confidence sources are selected by parallax, quality, and row limit. The 96-host NASA overlay is independent, not a Gaia crossmatch. No proper-motion epoch propagation or parallax zero-point correction is applied, and Gaia source selection is transient rather than URL-encoded.
- The Solar System is a bounded selected-epoch geometric model for eight planets within the declared 2000–2100 UTC window. It uses Astronomy Engine's UT1≈UTC input approximation with internally derived TT; it has no satellites, light-time correction, or aberration correction and makes no live-sky or high-precision pointing claim.
- The Moon expedition is a separate geometric geocentric model bounded to 2026-12-17 through 2026-12-19 UTC. Its schematic enlarged body and compressed separation are not an observed surface, calculated phase, visibility aid, or physical-scale orbit; no independent numeric uncertainty, light-time correction, or aberration correction is supplied.
- Exoplanet surfaces, cloud patterns, atmospheric appearance, orbital phases, and inclinations are illustrative. This is not an observed exoplanet surface map or exoplanet ephemeris.
- Atlas, neighbourhood, look-back, and orbital scales are compressed; missing atlas distances use a labeled illustrative shell. `pscomppars` values can come from different references.
- World classes are transparent visualization heuristics, not official taxonomy or habitability assessments. Unknown values remain omitted or explicitly unknown.
- Physical iOS/Android devices, Safari, and screen readers were not verified. Keyboard operation, focus restoration, reduced motion, DOM alternatives, blocked-clipboard recovery, and Chromium touch-sized layouts were verified.
- The static export and no-WebGL portrait are intentionally simpler than the shader portrait; both use the same world identity, recipe, evidence, camera state, and provenance.
- Three.js ships in the initial bundle; lazy loading and physical-device performance tuning remain technical hardening work.
- No live catalogue auto-refresh, account persistence, native-device sharing enhancement, or public deployment is included. No agent-started validation server remains; an independently owned original-copy preview is not touched by this project.
