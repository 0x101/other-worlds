# Validation results

Wonder/Observatory-checkpoint production-preview validation completed at `2026-11-26T15:27:27.211Z`. The machine-readable sources of truth are `evidence/browser-report.json`, `evidence/data-report.json`, and the reference-capture manifests; the screenshots listed below are committed evidence, not design mockups.

## Automated checks

- **Unit/logic:** 7 test files, **31/31 tests passed** with Vitest.
  - Parsing, malformed rows, duplicate identifiers, null handling, and atlas source labels.
  - Search and every filter.
  - Deterministic generation, giant/rocky treatments, measured-parameter influence, gravity, and orbital labels.
  - Evidence categories and missing-value behavior.
  - Traceability references, asymmetric uncertainties, compact-schema decoding, and cross-file identity/value checks.
  - Raw JSON/CSV source export, CSV escaping, and null preservation.
  - URL round trips, malformed values, camera clamps, and evidence-state rules.
- **Data integrity:** 6,473 parsed rows match provenance; 6,473 unique planet identifiers and 4,865 systems. The preserved base SHA-256 matches `6bcd8b57…cb362`. All **84,149** base/companion measurement comparisons and **440,164** raw/normalized cell comparisons passed across 2,321 shared publication references.
- **Production build:** TypeScript `--noEmit` and Vite build passed. Vite reports a large-chunk warning for the 805.07 kB minified main bundle (220.18 kB gzip); this is documented rather than suppressed.
- **CLI:** `npm run dev -- --help` reached Vite and displayed its `--host`, `--port`, and `--strictPort` options, confirming argument forwarding. Node.js 24.22.1 was used.

## Real-browser release gate

Playwright Chromium 159.0.8154.6 ran against the production `dist/` through an owned Vite preview process. **45/45 checks passed**, including:

- Full atlas → search → TRAPPIST-1 system → approach → evidence → share journey.
- Three curated journeys, seven real TRAPPIST-1 stops, keyboard focus containment, and trigger-focus restoration.
- Seven real TRAPPIST-1 sibling controls and source-field labels.
- Exact TRAPPIST-1 e asymmetric uncertainty display and an actionable Agol et al. 2021 publication link.
- Actual raw JSON and CSV downloads with source values, uncertainty fields, and both snapshot queries.
- DERIVED calculation and IMAGINED disclaimer inspection; Escape dismissal.
- Clipboard equality with the exact current URL; camera drag updates `az`/`el`; reload reopens identical state.
- Filters, empty results, and clear/recovery behavior.
- K2-18 b and HD 189733 b atmospheric treatments; gas giants do not receive terrain.
- Reduced-motion behavior, no-WebGL static rendering with evidence access, catalogue failure, and successful retry.
- **Zero uncaught page errors, zero console errors, and zero failed HTTP responses in normal journeys.** The deliberately aborted catalogue request is tested in a separate error context.
- The preview server and its descendants stopped after validation.

## Responsive evidence

| Capture | Viewport | Verified |
|---|---|---|
| `desktop-atlas.png` | 1440 × 960 | Initial frame, real-system field, search/filter dock, no overflow |
| `desktop-system.png` | 1440 × 960 | Orrery, sibling rail, approach action |
| `desktop-planet.png` | 1440 × 960 | Rocky portrait and measured summary |
| `desktop-evidence.png` | 1440 × 960 | Settled evidence panel and source labels |
| `desktop-gas-giant-reduced-motion.png` | 1280 × 800 | Banded gas giant with reduced motion |
| `desktop-static-fallback.png` | 1280 × 800 | No-WebGL reconstruction and mode notice |
| `mobile-atlas.png` | 375 × 812 | Opening frame, search/filter access, no page overflow |
| `mobile-planet.png` | 375 × 812 | Atmospheric portrait, fixed back link, metadata, 52 px primary action |
| `mobile-evidence.png` | 375 × 812 | Scrollable evidence dialog, no page overflow |
| `responsive-768-atlas.png` | 768 × 900 | Search visibility and no page overflow |
| `responsive-1024-atlas.png` | 1024 × 900 | Search visibility and no page overflow |

The images were opened and visually inspected after capture. Fixes made during the loop included removing a mobile transformed ancestor that displaced fixed back navigation, waiting for evidence transitions before capture, subsetting font assets, and replacing hard conic bands in the static rocky fallback.

## Performance observations

The cinematic-checkpoint software-rendered headless sample reported 43 FPS and 7 draw calls in the atlas, and 26 FPS and 5 draw calls in the close planet view (26,498 triangles). The atlas sample recorded 11 resource entries and 1,690,701 transfer bytes at capture time. Separate reference captures ranged from 15–20 FPS for desktop close portraits and 46–50 FPS for mobile/atlas views. These are diagnostic observations from one headless environment, **not physical-device frame-rate or network benchmarks**. The raw JSON snapshot is approximately 4.8 MiB on disk.

## Known limitations

- All surfaces, cloud patterns, atmospheric appearance, orbital phases, and inclinations are illustrative. This is not an observed surface map or an ephemeris.
- Atlas and orbital scales are compressed; missing atlas distances use a labeled illustrative shell. `pscomppars` values can come from different references.
- World classes are transparent visualization heuristics, not official taxonomy or habitability assessments.
- Physical iOS/Android devices, Safari, screen readers, and a complete modal focus-trap audit were not verified. Keyboard operation, reduced motion, DOM alternatives, and Chromium touch-sized layouts were verified.
- The no-WebGL portrait is intentionally simpler than the shader portrait.
- Three.js currently ships in the initial bundle; lazy loading and physical-device performance tuning remain roadmap items.
- No postcard generator, live catalogue auto-refresh, account persistence, or public deployment is included. No agent-started validation server remains; the desktop client independently owns its final preview process.
