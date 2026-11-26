# Architecture

## Stack

React 19 + TypeScript + Vite for the static application; Three.js and OrbitControls for rendering; Lucide for interface icons; `qrcode` for exact-link QR encoding; Vitest for focused logic checks; Playwright for real-browser validation. There is no runtime backend, database, SSR, API key, or external asset service.

## Modules

- `src/lib/catalogue.ts`: strict parsing, null preservation, unique indexes, system grouping, filters, sky projection, and source labeling for layout fallbacks.
- `src/lib/world.ts`: identifier hashing, seeded generation, classification, palette/scale/illumination rules, gravity, and compressed orbits.
- `src/lib/evidence.ts`: measured/derived/imagined evidence records and detection labels.
- `src/lib/traceability.ts`: strict raw/columnar companion parsing, publication-link sanitization, asymmetric uncertainty formatting, and base/companion integrity checks.
- `src/lib/exports.ts`: exact source-record JSON/CSV generation and browser downloads; nulls and source precision are preserved.
- `src/lib/fingerprint.ts`: deterministic system glyphs from known sibling periods, eccentricities, radii, and stable identities; unknown orbital inputs are not zero-filled.
- `src/lib/share.ts`: fixed template mapping, high-resolution 2D-canvas artwork, scientific plates, orbital studies, provenance, QR codes, and exact-link reproduction.
- `src/lib/urlState.ts`: parsing, validation, clamping, serialization, legacy migration, and history updates for journey, interpretation mode, camera, and Share template.
- `src/lib/wonder.ts`: concise measured/derived explanations and three curated journeys whose stops resolve against the real catalogue.
- `src/lib/useDialogFocus.ts`: shared keyboard focus containment, Escape dismissal, and trigger-focus restoration.
- `src/components/WonderPanel.tsx` and `JourneysPanel.tsx`: novice interpretation integrated into the same selected-world journey.
- `src/components/OrbitalFingerprint.tsx`: accessible SVG rendering of the same deterministic system fingerprint used in exports.
- `src/components/ShareDialog.tsx`: live PNG preview, three finished template choices, exact-link copy/recovery, download, retry, and contextual dialog behavior.
- `src/components/Scene.tsx`: one persistent renderer, class-specific procedural surface/cloud shaders, directional and relief-sensitive lighting, normalized portrait framing, outgoing-scene crossfades, interruptible camera transitions, 3D picking, resizing, disposal, and render metrics.
- `src/components/StaticScene.tsx`: SVG/CSS fallback views using the same real data and recipes.
- `src/App.tsx`: data loading/integrity check, journey state, navigation, Share/Observatory coordination, responsive DOM, and fallback selection.
- `scripts/fetch-catalogue.mjs`: direct TAP download with sanity checks and complete provenance.
- `scripts/validate-browser.mjs`: owned Vite dev/preview process, Chromium journeys, real PNG/raw-data downloads, screenshots, network/console/performance capture, and descendant cleanup.

## Data flow

1. `App` fetches the preserved base JSON, its provenance, the normalized traceability companion, and companion provenance in parallel. The 17 MiB raw companion is not in the web bundle.
2. Parsing validates identity, numeric/string field types, finite values, normalized schema widths/reference indexes, and uniqueness; absent optional fields become null.
3. Both loaded row counts must match their provenance. All 13 traceable source values and host identity must agree for every planet, or the retryable error state appears.
4. Indexes expose every planet and system to the DOM and renderer. The atlas stores one point per host; selection resolves the complete sibling list and its source traceability row.
5. A planet recipe is a pure function of the source row. No `Math.random()` or time-based texture seed is used. Preview and export receive the same selected row, siblings, recipe, camera, and provenance.

## URL state

- `planet`: exact catalogue identifier, encoded with `URLSearchParams`.
- `view`: `system` or `planet`; absence means atlas. A planet without a valid view opens its system.
- `q` and `filter`: current search/filter state.
- `mode`: `wonder` or `observatory`; legacy `evidence=1` opens Observatory and remains supported.
- `az` and `el`: planet-camera azimuth/elevation in radians, clamped and rounded to three decimals.
- `share`: `portrait`, `field-note`, or `orbital-study`. Share remains a dialog over the encoded world/view rather than becoming a peer destination.

Legacy `mode=studio` links migrate to `share=portrait`; obsolete `exp`, `comp`, and `crop` values are discarded. There is no standalone Studio mode or designer state. Closing Share removes only `share` and restores the same world, camera, and interpretation context. Navigation pushes user journey steps; search, dialog dismissal, template changes, and camera updates replace history to avoid flooding it. Browser back/forward reparses the URL. Invalid planet names produce a notice and return to the atlas rather than fabricating a record.

## Share rendering

- **Portrait:** 1800 × 2250, artwork-dominant, identity, one available measured/derived fact, concise art/provenance treatment.
- **Field Note:** 2400 × 1800, an editorial scientific plate with up to four facts, measured/derived/imagined explanations, attribution, printed reopen URL, and QR code.
- **Orbital Study:** 2200 × 2200, deterministic fingerprint plus real host/sibling values. Missing fields are omitted; long sibling lists are bounded with the real remaining count disclosed.

The export uses a deterministic 2D-canvas reconstruction rather than capturing WebGL, so full-resolution output is equivalent with reduced motion and without WebGL. Camera angles inform the static illumination. QR generation is locally bundled. The live preview is the actual PNG blob used for download, not a separate approximation.

## Rendering and lifecycle

The engine owns one WebGL renderer and persistent starfield. View content is disposed by geometry/material before rebuilding. ResizeObserver updates aspect and render size. Low-power mode uses lower pixel ratio, geometry density, and star counts. `webglcontextlost` or initialization failure switches to static views. The animation loop skips hidden documents.

For validation only, `window.__OTHER_WORLDS__` exposes scene readiness, view, counts, FPS, draw calls, and triangles. The browser runner uses this as an observable readiness signal rather than guessing from a fixed delay alone.

## Build shape

Vite emits a portable static `dist/` with `base: './'`. Fonts, QR generation, and data are local. Three.js and the shader renderer remain in the initial chunk; Vite's large-chunk warning and measured bundle sizes are recorded in `docs/VALIDATION.md` rather than suppressed.
