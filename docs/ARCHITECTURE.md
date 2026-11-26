# Architecture

## Stack

React 19 + TypeScript + Vite for the static application; Three.js and OrbitControls for rendering; Lucide for interface icons; Vitest for focused logic checks; Playwright for real-browser validation. There is no runtime backend, database, SSR, API key, or external asset service.

## Modules

- `src/lib/catalogue.ts`: strict parsing, null preservation, unique indexes, system grouping, filters, sky projection, and source labeling for layout fallbacks.
- `src/lib/world.ts`: identifier hashing, seeded generation, classification, palette/scale/illumination rules, gravity, and compressed orbits.
- `src/lib/evidence.ts`: measured/derived/imagined evidence records and detection labels.
- `src/lib/urlState.ts`: parsing, validation, clamping, serialization, and history updates.
- `src/components/Scene.tsx`: one persistent renderer, scene rebuilding per view, camera transitions, 3D picking, resizing, disposal, and render metrics.
- `src/components/StaticScene.tsx`: SVG/CSS fallback views using the same real data and recipes.
- `src/App.tsx`: data loading/integrity check, journey state, navigation, sharing, responsive DOM, and fallback selection.
- `scripts/fetch-catalogue.mjs`: direct TAP download with sanity checks and complete provenance.
- `scripts/validate-browser.mjs`: owned Vite dev/preview process, Chromium journeys, screenshots, network/console/performance capture, and descendant cleanup.

## Data flow

1. `App` fetches the bundled JSON array and provenance in parallel.
2. Parsing validates identity, numeric/string field types, finite values, and uniqueness; absent optional fields become null.
3. The loaded row count must equal `provenance.rowCount` or the retryable error state appears.
4. Indexes expose every planet and system to the DOM and renderer. The atlas stores one point per host; selection resolves the complete sibling list.
5. A planet recipe is a pure function of the source row. No `Math.random()` or time-based texture seed is used.

## URL state

- `planet`: exact catalogue identifier, encoded with `URLSearchParams`.
- `view`: `system` or `planet`; absence means atlas. A planet without a valid view opens its system.
- `q` and `filter`: current search/filter state.
- `evidence=1`: inspector state, only with a selected planet.
- `az` and `el`: planet-camera azimuth/elevation in radians, clamped and rounded to three decimals.

Navigation pushes user journey steps; search, evidence dismissal, and camera updates replace history to avoid flooding it. Browser back/forward reparses the URL. Invalid planet names produce a notice and return to the atlas rather than fabricating a record.

## Rendering and lifecycle

The engine owns one WebGL renderer and persistent starfield. View content is disposed by geometry/material before rebuilding. ResizeObserver updates aspect and render size. Low-power mode uses lower pixel ratio, geometry density, and star counts. `webglcontextlost` or initialization failure switches to static views. The animation loop skips hidden documents.

For validation only, `window.__OTHER_WORLDS__` exposes scene readiness, view, counts, FPS, draw calls, and triangles. The browser runner uses this as an observable readiness signal rather than guessing from a fixed delay alone.

## Build shape

Vite emits a portable static `dist/` with `base: './'`. Fonts and data are local. The main JavaScript bundle is currently about 783 kB minified (214 kB gzip) because Three.js and the shader renderer ship in the initial chunk; code splitting is a roadmap item, not a hidden optimization claim.
