# Validation results

Share/fingerprint production-preview validation completed at `2026-11-26T16:58:17.202Z`. The machine-readable sources of truth are `evidence/browser-report.json`, `evidence/data-report.json`, and the reference-capture manifests. Listed screenshots and PNG exports are committed browser output, not design mockups.

## Automated checks

- **Unit/logic:** 9 test files, **46/46 tests passed** with Vitest.
  - Parsing, malformed rows, duplicate identifiers, null handling, search, filters, and atlas source labels.
  - Deterministic generation, giant/rocky treatments, measured-parameter influence, gravity, and orbital labels.
  - Evidence categories, source references, asymmetric uncertainties, compact-schema decoding, and missing-value behavior.
  - Raw JSON/CSV source export, CSV escaping, and null preservation.
  - Wonder explanations and real curated-journey stops.
  - Fingerprint determinism across sibling ordering, same-system consistency, changed measured inputs, one-period systems, and entirely missing periods.
  - Portrait/Field Note fact mapping, Orbital Study sibling/host mapping, bounded long systems, unknown omission, high-resolution dimensions, filenames, and exact reopen URLs.
  - URL round trips for all Share templates, malformed values, camera clamps, Observatory context, evidence legacy links, and migration from standalone Studio/designer parameters.
- **Loaded data integrity:** the browser loaded 6,473 real planets in 4,865 systems and matched both snapshot row counts. The preserved data audit records 6,473 unique planet identifiers, the base SHA-256 `6bcd8b57…cb362`, **84,149** base/companion measurement comparisons, and **440,164** raw/normalized cell comparisons across 2,321 shared publication references.
- **Production build:** TypeScript `--noEmit` and Vite build passed. The main bundle is 828.34 kB minified (227.58 kB gzip); the QR browser chunk is 25.84 kB (10.14 kB gzip). Vite's large-chunk warning remains documented rather than suppressed.

## Real-browser release gate

Playwright Chromium ran against production `dist/` through an owned Vite preview process. **66/66 checks passed**, including:

- Full atlas → search → TRAPPIST-1 system → approach → Wonder/Observatory → Share journey.
- Three curated journeys, seven real TRAPPIST-1 stops, keyboard focus containment, and trigger-focus restoration.
- Seven real sibling controls, source-field labels, asymmetric uncertainty, publication link, DERIVED calculation, and IMAGINED disclaimer.
- Actual raw JSON and CSV downloads with source values, uncertainty fields, and snapshot queries; these controls remain in Observatory.
- Direct world-canvas camera drag updating `az`/`el`; reload reopens identical world/camera state.
- Studio absent from navigation and zero designer sliders. Legacy `mode=studio` plus `exp`/`comp`/`crop` opens Portrait Share and produces a normalized exact link without dead designer state.
- Share PNG encoder failure displays an explicit retry state and recovers without changing world/camera context.
- Exactly three finished templates, actual live PNG previews, no customization sliders, exact-link copying for each template, copied-link reopening, Escape dismissal, identical return URL, and trigger-focus restoration.
- Blocked clipboard access selects the full exact link for manual copying.
- Reduced-motion dialog/export, no-WebGL static rendering/export, catalogue failure/retry, filters, empty search, and clear recovery.
- **Zero uncaught page errors, zero unexpected console errors, and zero failed HTTP responses.** Three.js's expected context-creation diagnostic in the deliberately no-WebGL context is excluded from the normal-journey console gate. The deliberately aborted catalogue request is isolated in its error context.
- The preview server and its descendants stopped after validation.

## Actual PNG downloads

| Template | Filename | Dimensions | Bytes | Result |
|---|---|---:|---:|---|
| Portrait | `trappist-1-e-portrait.png` | 1800 × 2250 | 2,747,339 | PNG signature, dimensions, nonempty content, exact link, preview, and download passed |
| Field Note | `trappist-1-e-field-note.png` | 2400 × 1800 | 1,122,016 | PNG signature, dimensions, nonempty content, exact link, preview, and download passed |
| Orbital Study | `trappist-1-e-orbital-study.png` | 2200 × 2200 | 543,156 | PNG signature, dimensions, nonempty content, exact link, preview, and download passed |

Reduced-motion separately downloaded a nonempty 2400 × 1800 Field Note (1,176,968 bytes), and the no-WebGL context separately downloaded a nonempty 2200 × 2200 Orbital Study (542,832 bytes). File existence alone was not used as visual validation.

## Responsive and visual evidence

| Capture | Viewport/output | Verified |
|---|---|---|
| `desktop-atlas.png` | 1440 × 960 | Initial frame, real-system field, search/filter dock, no overflow |
| `desktop-system.png` | 1440 × 960 | Orrery, seven-world fingerprint, sibling rail, approach action |
| `desktop-planet.png` | 1440 × 960 | Rocky portrait and measured summary |
| `desktop-evidence.png` | 1440 × 960 | Evidence panel, source labels, and raw exports |
| `desktop-share-portrait.png` | 1440 × 960 | Strong Portrait preview, template picker, exact link, and download |
| `desktop-share-field-note.png` | 1440 × 960 | Distinct editorial scientific plate preview |
| `desktop-share-orbital-study.png` | 1440 × 960 | Fingerprint/system preview and real sibling information |
| `desktop-gas-giant-reduced-motion.png` | 1280 × 800 | Banded gas giant with reduced motion |
| `desktop-static-fallback.png` | 1280 × 800 | No-WebGL reconstruction and mode notice |
| `desktop-static-share.png` | 1280 × 800 | No-WebGL Orbital Study preview/export without overlay collisions |
| `mobile-atlas.png` | 375 × 812 | Opening frame, search/filter access, no page overflow |
| `mobile-planet.png` | 375 × 812 | Atmospheric portrait, fixed back link, metadata, 52 px primary action |
| `mobile-share.png` | 375 × 812 | Complete Share flow, three 44 px+ choices/actions, readable preview, no page overflow |
| `mobile-evidence.png` | 375 × 812 | Scrollable evidence dialog, no page overflow |
| `responsive-768-atlas.png` | 768 × 900 | Search visibility and no page overflow |
| `responsive-1024-atlas.png` | 1024 × 900 | Search visibility and no page overflow |
| `share-trappist-1-e-*.png` | Full-resolution exports | All three actual downloaded PNGs opened and inspected |

The initial Share/export captures were opened and inspected. That round identified a no-WebGL notice overlapping the Share header and insufficient Field Note footer contrast on the dark half. The fallback notice is now hidden while Share is open, and Field Note uses separate light/dark footer colors. After the final production run, the corrected Field Note PNG and no-WebGL Share capture were reopened and inspected; the other representative Portrait, Orbital Study, desktop, and mobile captures were also inspected.

## Performance observations

This production software-Chromium sample reported 35 FPS and 7 draw calls in the atlas, and 22 FPS and 5 draw calls in the close planet view (26,498 triangles). The atlas sample recorded 11 resource entries and 1,701,985 transfer bytes. These are diagnostic observations from one headless environment, **not physical-device frame-rate or network benchmarks**. The raw JSON snapshot is approximately 4.8 MiB on disk.

## Known limitations

- All surfaces, cloud patterns, atmospheric appearance, orbital phases, and inclinations are illustrative. This is not an observed surface map or an ephemeris.
- Atlas and orbital scales are compressed; missing atlas distances use a labeled illustrative shell. `pscomppars` values can come from different references.
- World classes are transparent visualization heuristics, not official taxonomy or habitability assessments. Unknown values remain omitted or explicitly unknown.
- Physical iOS/Android devices, Safari, and screen readers were not verified. Keyboard operation, focus restoration, reduced motion, DOM alternatives, blocked-clipboard recovery, and Chromium touch-sized layouts were verified.
- The static export and no-WebGL portrait are intentionally simpler than the shader portrait; both use the same world identity, recipe, evidence, camera state, and provenance.
- Three.js ships in the initial bundle; lazy loading and physical-device performance tuning remain technical hardening work.
- No live catalogue auto-refresh, account persistence, native-device sharing enhancement, or public deployment is included. No agent-started validation server remains; the desktop client independently owns its final preview process.
