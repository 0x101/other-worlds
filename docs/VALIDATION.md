# Validation results

Golden-path production-preview validation completed on `2026-11-28` local time. The machine-readable sources of truth are `evidence/browser-report.json`, `evidence/data-report.json`, and the reference-capture manifests. Listed screenshots and PNG exports are committed browser output, not design mockups.

## Automated checks

- **Unit/logic:** 18 test files, **84/84 tests passed** with Vitest.
  - Earth-first/default URLs, Explore, all golden-path stops, journey origin, selected-world look-back/resume, camera state, malformed input, Share templates, and legacy migration.
  - ISS strict millisecond ISO UTC parsing, source-epoch fallback, ±12 h bounds, clamped ten-minute steps, exact reference TEME vector/geocentric distance, changed-time propagation, 47-point trace bounds, formatting, component controls, exact-link state, and non-Earth cleanup.
  - Moon strict ISO UTC parsing, reference-epoch fallback, ±24 h bounds, clamped three-hour steps, exact reference EQJ/ECL vectors and geocentric distance, changed-time derivation, 25-point trace bounds, one-active-expedition links, component controls, and non-Earth cleanup.
  - Selected Solar System epochs, strict ISO UTC parsing and fallback, bounded day/fractional-day steps, non-zero epoch seconds/milliseconds, invalid-date recovery, eight finite heliocentric positions, source EQJ and display ECL/J2000 frame contracts, logarithmic display radii, bounded real nearby hosts, and no fabricated look-back geometry.
  - Gaia schema and J2016.0 / TCB contracts, exact string source IDs, quality gates, ordered geometric-distance intervals, logarithmic positions, deterministic display colour, strict integer offset normalization, ±10,000-year bounds, 1,000-year steps, independent tangent-motion derivation, direct μα* semantics, fixed display radius, exact-link rejection rules, and manual component controls.
  - Catalogue parsing, duplicate identifiers, null handling, search, filters, deterministic generation, source-parameter influence, gravity, evidence, traceability, raw exports, Wonder, fingerprints, and Share mappings.
- **Loaded data integrity:** the browser loaded 6,473 real planets in 4,865 systems and matched both NASA snapshot row counts. The preserved data audit records 6,473 unique planet identifiers, base SHA-256 `6bcd8b57…cb362`, **84,149** base/companion measurement comparisons, and **440,164** raw/normalized cell comparisons across 2,321 shared publication references. It also rebuilt and exactly matched all **384** Gaia runtime rows against the raw CSV, with 384 unique string IDs, raw SHA-256 `b61bb8e0…de96b8b257dc`, and published median distances from 1.8281064 to 14.2755337 pc.
- **Gaia selected-time integrity:** an independent implementation, separate from application imports, verified Barnard's Star (`4472832130942575872`) at +1,000 TCB Julian years. Reference RA/Dec is `269.44850252543836° / 4.739420051112413°`; selected RA/Dec is `269.22415225477783° / 7.615387229063911°`, an angular change of `2.884601639026622°`. The reference/model distance changes from `1.8281064` to `1.8304256993182295` pc while the fixed display radius remains `10.869444679928385` scene units. The model distance is not relabeled as the published J2016.0 interval. Radial velocity is zero by explicit assumption and selected-time covariance is null.
- **ISS data integrity:** satellite.js 7.2.0 independently matched the raw OMM/manifest elements, raw SHA-256 `c624f089…8bf46be`, exact source epoch `2026-11-27T09:29:25.185696Z`, reference Earth-centred TEME kilometre vector, and geocentric distance. A separate probe at `2026-11-27T09:39:25.185Z` verified changed-time derivation. The audit retains `historical: true`, `liveRefresh: false`, `lightTimeCorrection: false`, and `uncertainty: null`; the ±12 h selection bounds are not represented as an accuracy estimate.
- **Moon data integrity:** Astronomy Engine 2.1.19 independently regenerated the geometric geocentric reference at `2026-12-18T00:00:00.000Z` and exactly matched its retained 12-decimal EQJ/J2000 au and ECL/J2000 au vectors. The derived geocentric distance is `385514.9531405406 km`; a separate probe at `2026-12-18T03:00:00.000Z` verified changed-time derivation. Light-time and aberration corrections are false, uncertainty is null, and neither a surface nor a calculated phase is claimed.
- **Solar data integrity:** Astronomy Engine 2.1.19 independently regenerated all eight reference-epoch bodies and exactly matched their retained 12-decimal EQJ/J2000 au and ECL/J2000 au vectors. A separate Mercury probe at `2027-01-02T00:00:00.000Z` verified selected-epoch derivation. The declared UTC window is `2000-01-01T00:00:00.000Z` through `2100-01-01T00:00:00.000Z`; light-time and aberration corrections remain false in the audit.
- **Production build:** TypeScript `--noEmit` and Vite build passed. The main bundle is **1,168.44 kB** minified (**331.77 kB gzip**), CSS is **49.76 kB** (**9.47 kB gzip**), and the QR browser chunk is **25.84 kB** (**10.14 kB gzip**). Vite's large-chunk warning remains documented rather than suppressed.

## Real-browser release gate

Playwright Chromium passed **170/170 checks against the development server and again against production `dist/`**, including:

- Cold start on Earth with no unsolicited satellite tracker, explicit You Are Here context, Leave Earth, selected-epoch eight-planet Solar System, Gaia DR3 neighbourhood with 96-host NASA overlay, TRAPPIST-1 system, planet approach, schematic look-back, portrait resume, and return home without recreating the renderer.
- Meet the ISS opening the actual CelesTrak credit and source epoch; independent satellite.js reference vectors matching the WebGL marker within `1e-7` km; ten-minute stepping and exact-link reload; source/microsecond/historical-age/scale audit; reset and clean close. Canvas identity and camera coordinates remain unchanged across opening and stepping.
- Meet the Moon opening the pinned Astronomy Engine credit and reference epoch; independent `GeoMoon` EQJ/ECL reference vectors matching the WebGL marker; three-hour stepping and exact-link reload; reference/time-scale/display-compression/scientific-limits audit; reset and clean close. Canvas identity and camera coordinates remain unchanged across opening and stepping.
- Previous/next UTC day, play/pause, date selection, and reset; exact selected-epoch links surviving reload; redundant default epoch state removed from the URL; visible invalid-date drafts with same-date recovery; Astronomy Engine credited instead of the NASA exoplanet snapshot.
- Existing Solar planet meshes, guide rings, and Earth marker updating without recreating the renderer, controls, or camera. A post-orbit settled camera remained coherent across later epoch changes within the declared damping tolerance, with before/after coordinates recorded in the report.
- Gaia previous/next 1,000-year steps, integer slider keyboard input, Home/End bounds, reset, and exact-link reload. Selected-time changes preserve canvas, camera, controls, and the independent NASA host geometry. Barnard's Star matches independent selected-time RA/Dec within `1e-10` degrees and actual Float32 display coordinates within `0.000002` scene units, with fixed display radius.
- A projected-coordinate click on an actual WebGL Gaia point opening its exact source inspector; an exact-ID audit exposing all 384 sources; and Barnard's Star retaining source ID `4472832130942575872`, parallax `546.976 ± 0.040 mas`, proper-motion errors, and the distinct published J2016.0 interval `1.8280–1.8282` pc. The inspector separates derived selected-time RA/Dec from J2016.0 distance and discloses zero radial velocity by assumption, no full-covariance propagation, and fixed display radius.
- Direct astrometry-field documentation and explicit motion limits in the method sheet. Desktop and mobile sheets and inspectors stay inside the viewport and clear of the primary course action and time instrument; mobile sheets suppress the time instrument until dismissed, and mobile source inspection suppresses the covered secondary atlas action. Closing the inspector restores that action and the time instrument; selection closes the sheet without losing the inspector.
- Explore opening the complete atlas, atlas/system/planet/evidence/Share deep links, origin-aware back navigation, search/filter/empty recovery, and legacy world-link normalization.
- Three curated journeys, seven real TRAPPIST-1 stops, keyboard focus containment, and trigger-focus restoration.
- Seven real sibling controls, source-field labels, asymmetric uncertainty, publication link, DERIVED calculation, IMAGINED disclaimer, and actual raw JSON/CSV downloads.
- Direct world-camera drag updating `az`/`el`, with reload reopening identical world/camera state.
- Share PNG failure/retry, exactly three finished templates, actual previews, exact-link copying/reopening, high-resolution PNG downloads, Escape dismissal, and focus restoration.
- Mobile Earth → ISS ten-minute step/close → Moon three-hour step/close → Solar System/time step → Gaia neighbourhood/time step/method/source → Explore → K2-18 system → planet → Share/evidence, no page overflow, fixed back navigation, 44 px+ actions, and geometric non-overlap of the ISS/Moon instruments, Earth narrative/departure/credit, Solar and Gaia time panels, course action, planet rail, inspector, method sheet, field guide, look-back/Share row, and primary actions.
- 768 px and 1024 px atlas layouts; reduced-motion ISS, Moon, Solar System, and Gaia neighbourhood with no playback or CSS animation plus retained explicit stepping; gas-giant/Share behavior; no-WebGL Earth with independently checked static ISS TEME and Moon EQJ/ECL geometry and exact still labels → selected-epoch Solar System with updated retained EQJ vectors and honest still-view copy → all-384-source Gaia neighbourhood with selected-time SVG geometry, fixed NASA hosts, source inspector, and static planet/evidence/Orbital Study export; catalogue failure/retry on Earth.
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

Run 006's affected Gaia captures were opened and visually inspected; the final mobile method/source and desktop source captures were reopened after the last layout fix. Desktop method and source sheets were also inspected in native-resolution crops:

| Capture | Viewport/output | Visually checked |
|---|---|---|
| `desktop-neighbourhood.png` | 1440 × 960 | Nonblack continuous sky, catalogue-derived sources and hosts, readable reference-time state, bounded controls, and no collision |
| `desktop-gaia-selected-time.png` | 1440 × 960 | Coherent nonblack scene, legible +1,000-year state, manual controls, and scientific disclosure |
| `desktop-gaia-method.png` | 1440 × 960 | Bounded method sheet, readable native-resolution provenance and prose motion-model description, direct field-documentation link, and explicit model limits |
| `desktop-gaia-source.png` | 1440 × 960 | Readable native-resolution derived RA/Dec, measured proper-motion errors, published J2016.0 distance/interval, fixed-radius disclosure, and no time-instrument overlap |
| `mobile-gaia-selected-time.png` | 375 × 812 | Nonblack neighbourhood, bounded selected-time instrument, 44 px controls, intact course action and disclosure, and no page overflow |
| `mobile-gaia-method.png` | 375 × 812 | Bounded internally scrollable method sheet, readable provenance, course clearance, and suppressed time instrument |
| `mobile-gaia-source.png` | 375 × 812 | Bounded internally scrollable source inspector, selected-time and reference-epoch distinctions, suppressed secondary atlas action, and clear primary course action |
| `desktop-neighbourhood-reduced-motion.png` | 1280 × 800 | Complete nonblack scene, no playback or CSS animation, and retained explicit manual time stepping |
| `desktop-static-gaia-selected-time.png` | 1280 × 800 | Honest still reconstruction, equivalent selected-time SVG geometry, retained source audit, and no-WebGL explanation |
| `desktop-static-gaia-source.png` | 1280 × 800 | Static selected-time source inspection with derived direction, published J2016.0 distance, and scientific limits intact |

The same production report also records ordinary Earth, ISS/Moon, Solar System, look-back, atlas, system, planet, evidence/Share, gas-giant, responsive, and additional static captures. Earlier review rounds opened and inspected those affected states and retained their findings in `evidence/round-1/` through `round-4/` and the committed reports.

The first Gaia selected-time development attempt exposed two concrete defects: a `0.015625 px` overlap between the desktop source inspector and time instrument, and a browser callback that referenced the Node-only `BARNARD_SOURCE_ID` constant. Bounding the desktop inspector above the instrument resolved the measured overlap; passing the source ID explicitly into the callback removed the invalid browser-scope reference. The corrected development run and a fresh production run then passed all 169 checks with zero page, console, or HTTP failures.

The final mobile visual pass found that the fixed source-inspector top edge partially covered the secondary “Open the full exoplanet atlas” action even though the primary course remained clear. The cause was the inspector state sharing the same narrative-action region on a narrow viewport. While mobile source inspection is active, only that covered secondary action is suppressed; closing the inspector restores it and the time instrument. A browser regression verifies both suppression and restoration, raising the final development and production gates to 170/170 passing checks with zero page, console, or HTTP failures.

The mobile visual pass identified nested absolute positioning that collapsed look-back and Share into the field guide. The fix resets the nested controls to normal flex items, gives the row a bounded full-width position, and preserves an actual gap to the primary action. A bounding-rectangle regression check now fails on overlap even when the controls are technically visible.

The earlier Gaia visual pass found three concrete defects: three-decimal formatting collapsed Barnard's narrow distance interval; the mobile inspector initially covered the course action; and a transformed animated ancestor made the fixed method sheet relative to the narrative copy, causing mobile overlap and desktop clipping. Four-decimal interval display, compact bounded inspector geometry, an explicit method-sheet close button, and removal of that ancestor transform animation resolved them. Browser geometry assertions cover the responsive fixes.

The Solar camera-continuity pass initially attributed post-drag movement to epoch updates. A targeted run-004 time series confirmed residual OrbitControls damping: the fixed 2.3 s wait could sample a still-moving pose, while the later epoch click changed an actually settled camera by less than 0.0001 scene units and left the target fixed. The regression now requires two consecutive diagnostic samples within 0.0001 units, polled at the diagnostic cadence with a bounded 15 s timeout, before changing epoch. It retains the existing 0.01-unit continuity tolerance rather than weakening the contract or resetting the camera.

The Solar date pass found that an invalid controlled input was immediately restored to the unchanged epoch, preventing a change event when the visitor reselected that same date. A separate draft now preserves the invalid attempt and permits deterministic recovery. The still fallback also replaces the inapplicable drag instruction with explicit still-view guidance. Component and browser regressions cover both behaviors; a browser assertion inspects the complete shared paragraph rather than searching for an exact element containing only its second line.

## Performance observations

The final production software-Chromium sample, validated at `2026-11-28T05:54:58.866Z`, reported:

| View | FPS | Draw calls | Triangles |
|---|---:|---:|---:|
| Earth | 34 | 2 | 20,896 |
| Earth + ISS expedition | 42 | 5 | 22,056 |
| Earth + Moon expedition | 42 | 5 | 22,728 |
| Solar System | 57 | 19 | 14,754 |
| Gaia neighbourhood + host overlay at +1,000 years | 60 | 3 | 2 |
| Look-back | 60 | 3 | 722 |
| Atlas | 60 | 6 | 2 |
| TRAPPIST-1 e portrait | 26 | 4 | 26,498 |

The Earth sample recorded 12 resource entries and 2,321,737 transfer bytes; the separate atlas sampling window recorded 12 entries and 3,600 transfer bytes. These are diagnostic observations from one headless software-rendered environment, **not physical-device frame-rate or network benchmarks**. The raw base JSON snapshot is approximately 4.8 MiB on disk.

## Known limitations

- **The Gaia layer is a bounded sample, not a complete census.** Its 384 bright, high-confidence sources are selected by parallax, quality, and row limit. Selected time is a bounded constant-Cartesian transverse-motion approximation over ±10,000 integer TCB Julian years, with zero radial velocity by assumption. It does not propagate full covariance, unknown radial velocity, perspective/binary/orbital acceleration, or a selected-time distance interval. Display radius remains fixed at the published J2016.0 median-distance transform, no parallax zero-point correction is applied, and source selection is transient rather than URL-encoded. The 96-host NASA overlay is independent, not a Gaia crossmatch, and does not move with Gaia selected time.
- The Solar System is a bounded selected-epoch geometric model for eight planets within the declared 2000–2100 UTC window. It uses Astronomy Engine's UT1≈UTC input approximation with internally derived TT; it has no satellites, light-time correction, or aberration correction and makes no live-sky or high-precision pointing claim.
- The Moon expedition is a separate geometric geocentric model bounded to 2026-12-17 through 2026-12-19 UTC. Its schematic enlarged body and compressed separation are not an observed surface, calculated phase, visibility aid, or physical-scale orbit; no independent numeric uncertainty, light-time correction, or aberration correction is supplied.
- Exoplanet surfaces, cloud patterns, atmospheric appearance, orbital phases, and inclinations are illustrative. This is not an observed exoplanet surface map or exoplanet ephemeris.
- Atlas, neighbourhood, look-back, and orbital scales are compressed; missing atlas distances use a labeled illustrative shell. `pscomppars` values can come from different references.
- World classes are transparent visualization heuristics, not official taxonomy or habitability assessments. Unknown values remain omitted or explicitly unknown.
- Physical iOS/Android devices, Safari, and screen readers were not verified. Keyboard operation, focus restoration, reduced motion, DOM alternatives, blocked-clipboard recovery, and Chromium touch-sized layouts were verified.
- The static export and no-WebGL portrait are intentionally simpler than the shader portrait; both use the same world identity, recipe, evidence, camera state, and provenance.
- Three.js ships in the initial bundle; lazy loading and physical-device performance tuning remain technical hardening work.
- No live catalogue auto-refresh, account persistence, native-device sharing enhancement, or public deployment is included. No agent-started validation server remains; an independently owned original-copy preview is not touched by this project.
