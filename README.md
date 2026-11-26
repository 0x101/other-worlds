# Other Worlds

A locally runnable, cinematic exoplanet field atlas built with React, TypeScript, Vite, and Three.js. The included snapshot contains **6,473 unique planets in 4,865 systems** from the NASA Exoplanet Archive `pscomppars` table.

The central journey is continuous: observed-sky atlas → real planetary system → procedural planet portrait → evidence inspector → exact shareable URL.

## Run

Requires Node.js 22.12+ (developed and verified with Node.js 24.22.1).

```bash
npm ci
npm run dev -- --host 127.0.0.1 --port 7100
```

Open `http://localhost:7100/`. The Vite `dev` script forwards host and port arguments. No API key, backend, account, or runtime data service is required.

## Verify

```bash
npm test
npm run build
npm run data:validate                    # full base/companion/raw integrity audit
npm run validate:browser                 # development server, then stops it
node scripts/validate-browser.mjs --preview  # production dist, then stops it
```

Browser validation requires Playwright Chromium (`npx playwright install chromium` on a fresh machine). It writes final screenshots and `evidence/browser-report.json`. The validation script owns and stops its server and descendants; it does not leave a preview running.

## Data

The application reads the bundled real snapshot at `public/data/pscomppars.json`; it does not depend on a live NASA request at runtime. `public/data/provenance.json` records the exact request URL, query, fetch time, counts, field list, missing counts, attribution, and composite-table caveat. `data-query.sql` contains the same query.

A separate 3.5 MiB columnar companion adds source uncertainties, limit flags, per-parameter publications, and discovery instrument metadata. Its 17 MiB raw response remains reproducible at `data/raw/pscomppars-traceability.json` and is not shipped. Both files are cross-checked for all 6,473 planets before the atlas opens. Raw JSON/CSV export is available in the evidence inspector.

To intentionally refresh the snapshots:

```bash
npm run data:fetch                 # replaces the preserved base: review deliberately
npm run data:fetch:traceability   # raw + normalized companion
npm run data:validate
npm test
npm run build
```

A refresh replaces the snapshot with a new full real response and refuses suspiciously small or duplicate-containing responses. Review and commit the resulting data and provenance together.

## Controls and sharing

- Drag the atlas or planet to orbit; scroll/pinch to travel where enabled.
- Search by planet or host; filter by derived rocky/giant class, archive equilibrium-temperature band, transit flag, or distance.
- Select a result or 3D target, choose a sibling world, then approach the planet.
- Wonder gives concise, evidence-bound explanations; three curated journeys resolve only real catalogue entries.
- Observatory separates **MEASURED** archive-reported fields, **DERIVED** app calculations, and **IMAGINED** reconstruction, with source uncertainties, publications, raw exports, and dialog focus management.
- URLs preserve planet, view, interpretation mode, search/filter, evidence state, and planet-camera angles. Share copies the current URL.
- Reduced-motion, low-power rendering, static no-WebGL reconstructions, loading, empty, and retryable data-error states are included.

## Documentation

- [Product vision and scope](docs/PRODUCT.md)
- [Visual and motion system](docs/DESIGN.md)
- [Data provenance, field mapping, and evidence rules](docs/DATA.md)
- [Architecture and URL state](docs/ARCHITECTURE.md)
- [Validation results and limitations](docs/VALIDATION.md)
- [Prioritized roadmap](docs/ROADMAP.md)
- [Credits](CREDITS.md)

This is a vertical slice, not an ephemeris, habitability assessment, or observed surface atlas. Planet surfaces, clouds, atmospheric color/thickness, orbital phases, and some layout fallbacks are explicitly illustrative.
