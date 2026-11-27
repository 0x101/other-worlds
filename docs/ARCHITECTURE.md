# Architecture

## Stack

React 19 + TypeScript + Vite for the static application; Three.js and OrbitControls for rendering; Lucide for interface icons; `qrcode` for exact-link QR encoding; Vitest for focused logic checks; Playwright for real-browser validation. Astronomy Engine 2.1.19 is pinned as a local runtime/generator dependency for the eight-body geometric ephemeris. Satellite.js 7.2.0 is pinned for the separate archived ISS expedition; its pure-TypeScript ESM calculation modules avoid the package root's optional WASM-worker/top-level-await entry shape without reimplementing propagation. There is no runtime backend, database, SSR, API key, or external asset service.

## Modules

- `src/lib/goldenPath.ts`: preserved Solar System snapshot typing, deterministic selected-epoch `HelioVector` derivation, EQJ→ECL display transformation, bounded real nearby-host selection, archive direction, look-back geometry, and observer/scale/frame labels for every view.
- `src/lib/solarTime.ts`: strict ISO UTC parsing, the 2000–2100 product window, reference-epoch fallback, deterministic day/fractional-day steps, and explicit UTC formatting.
- `src/lib/iss.ts`: strict millisecond ISO UTC input, ±12 h source-relative interaction bounds, pinned SGP4 propagation, TEME kilometre readout, direction-preserving display mapping, bounded local trace generation, and fixed historical-age formatting.
- `src/lib/gaia.ts`: strict runtime validation of the bounded Gaia manifest, exact string source IDs and index, J2016.0 / TCB quality contracts, published geometric-distance intervals, logarithmic display positions, and the disclosed BP−RP display colour ramp.
- `src/lib/catalogue.ts`: strict parsing, null preservation, unique indexes, system grouping, filters, sky projection, and source labeling for layout fallbacks.
- `src/lib/world.ts`: identifier hashing, seeded generation, classification, palette/scale/illumination rules, gravity, and compressed orbits.
- `src/lib/evidence.ts`: measured/derived/imagined evidence records and detection labels.
- `src/lib/traceability.ts`: strict raw/columnar companion parsing, publication-link sanitization, asymmetric uncertainty formatting, and base/companion integrity checks.
- `src/lib/exports.ts`: exact source-record JSON/CSV generation and browser downloads; nulls and source precision are preserved.
- `src/lib/fingerprint.ts`: deterministic system glyphs from known sibling periods, eccentricities, radii, and stable identities; unknown orbital inputs are not zero-filled.
- `src/lib/share.ts`: fixed template mapping, high-resolution 2D-canvas artwork, scientific plates, orbital studies, provenance, QR codes, and exact-link reproduction.
- `src/lib/urlState.ts`: parsing, validation, clamping, serialization, legacy migration, and history updates for the seven-stop view model, Earth-bound selected ISS epoch, selected Solar epoch, journey origin, interpretation mode, camera, and Share template.
- `src/lib/wonder.ts`: concise measured/derived explanations and three curated journeys whose stops resolve against the real catalogue.
- `src/lib/useDialogFocus.ts`: shared keyboard focus containment, Escape dismissal, and trigger-focus restoration.
- `src/components/Expedition.tsx` and `SolarTimeControls.tsx`: Earth, Solar System, Gaia neighbourhood, and look-back DOM narration/disclosures, selected-epoch controls, exact-source selector/inspector, and reversible navigation.
- `src/components/IssExpedition.tsx`: optional Earth instrument for source-epoch reset, explicit ten-minute steps, exact UTC readout, historical source age, frame/scale disclosures, scientific source links, and explicit close.
- `src/components/WonderPanel.tsx` and `JourneysPanel.tsx`: novice interpretation integrated into the same selected-world journey.
- `src/components/OrbitalFingerprint.tsx`: accessible SVG rendering of the same deterministic system fingerprint used in exports.
- `src/components/ShareDialog.tsx`: live PNG preview, three finished template choices, exact-link copy/recovery, download, retry, and contextual dialog behavior.
- `src/components/Scene.tsx`: one persistent renderer across all views, Earth texture/atmosphere, in-place ISS trace/marker derivation with fixed-ratio responsive display framing, selected-epoch Solar System updated in place, 384 Gaia points plus 96 selectable NASA host lights, class-specific procedural exoplanet shaders, directional lighting, normalized framing, outgoing-scene crossfades, interruptible camera transitions, host-priority 3D picking, resizing, disposal, and render/epoch/camera metrics.
- `src/components/StaticScene.tsx`: Earth with equivalent ISS trace/marker, selected-epoch Solar System with retained source/display vectors, all-source Gaia neighbourhood, atlas, system, planet, and look-back still alternatives using the same data and recipes.
- `src/App.tsx`: data loading/integrity check, golden-path and atlas state, Earth-only ISS state, bounded model-time playback, transient Gaia selection, origin-aware navigation, Share/Observatory coordination, responsive DOM, and fallback selection.
- `scripts/build-solar-snapshot.mjs`: reproducible Astronomy Engine `HelioVector` generation at the reference epoch; original EQJ/J2000 au vectors and ECL/J2000 display vectors are both retained.
- `scripts/build-iss-expedition.mjs`: offline validation and manifest generation from the preserved CelesTrak OMM, including exact identity, microseconds, raw hash, retrieval basis, TEME reference propagation, selection bounds, display transform, and staleness contract.
- `scripts/fetch-catalogue.mjs`: direct NASA TAP download with sanity checks and complete provenance.
- `scripts/fetch-gaia-neighbourhood.mjs`: bounded ARI partner TAP download or preserved-CSV input, strict CSV/quality/identity validation, exact source IDs, and reproducible raw/runtime/query outputs with provenance.
- `scripts/validate-browser.mjs`: owned Vite dev/preview process, Chromium golden-path and atlas journeys, independently propagated desktop/mobile/reduced-motion/no-WebGL ISS checks, projected WebGL Gaia picking, exact-ID source inspection, real PNG/raw-data downloads, screenshots, network/console/performance capture, geometry assertions, and descendant cleanup.

## Moon expedition integration

- `src/lib/moon.ts` uses the pinned runtime `GeoMoon`, `KM_PER_AU`, and `Rotation_EQJ_ECL()` for strict-millisecond, Earth-centred EQJ/J2000 au derivation inside a ±24 h interaction window. `src/components/MoonExpedition.tsx` provides explicit three-hour steps, reference reset, physical-distance readout, UTC/TT/frame/scale/uncertainty disclosures, source links, and close. `scripts/build-moon-expedition.mjs` deterministically preserves the reference manifest without network access.
- `moonEpoch` is Earth-only exact-link state serialized as `?moon=`. The URL parser and application callbacks keep ISS and Moon mutually exclusive; a legacy ISS parameter takes precedence if both are supplied. Leaving Earth or closing the instrument clears Moon state, while time steps replace rather than flood history.
- The existing Earth renderer owns the Moon trace/marker. EQJ and ECL vectors remain CPU data; the ECL `(x,z,−y)` direction is retained while separation is fixed at `3.45` before a common `0.82` desktop or `0.48` phone screen-fit scale on Earth/atmosphere/Moon. The camera, canvas, controls, and physical values do not change. Closing restores the ordinary Earth display scale and disposes the Moon objects.
- The schematic sphere/ring and fixed scene lighting are not an observed surface or calculated phase. No-WebGL uses the same pure derivation for an SVG trace/marker with `data-eqj-au` and `data-ecl-au`. WebGL diagnostics and `.scene-canvas.dataset.moonEpoch`, `dataset.moonEqjAu`, and `dataset.moonEclAu` support independent browser checks.

## Data flow

1. `App` fetches the preserved NASA base JSON, its provenance, the normalized traceability companion, and companion provenance in parallel. The 17 MiB raw NASA companion is not in the web bundle.
2. Parsing validates identity, numeric/string field types, finite values, normalized schema widths/reference indexes, and uniqueness; absent optional fields become null.
3. Both loaded NASA row counts must match their provenance. All 13 traceable source values and host identity must agree for every planet, or the retryable error state appears.
4. Indexes expose every planet and system to the DOM and renderer. The atlas stores one point per host; selection resolves the complete sibling list and its source traceability row.
5. The ISS manifest is imported locally. Opening its Earth instrument derives the selected historical instant through pinned satellite.js, updates the existing Earth scene, and retains the source's exact microsecond epoch separately from millisecond UI/URL state. No runtime CelesTrak request or visitor-clock selection occurs.
6. The Gaia snapshot is imported locally and validated by `src/lib/gaia.ts`; it does not require a runtime catalogue request. The neighbourhood renders all 384 Gaia sources and independently overlays the 96 nearest NASA hosts with complete RA/Dec and positive finite archive distance. It neither fabricates missing geometry nor implies a crossmatch or complete census.
7. Gaia picking resolves the exact string source ID into transient inspection state; host picking takes priority. The details panel provides a DOM selector for every Gaia source, and selection closes the sheet without losing the inspector. Static SVG circles preserve the same source identities without WebGL.
8. The reference Solar System epoch is `2026-11-26T00:00:00.000Z`. At that epoch the application uses the generated local snapshot exactly; for other selected epochs, pinned Astronomy Engine computes eight geometric heliocentric EQJ/J2000 au vectors locally, then `Rotation_EQJ_ECL()` supplies ECL/J2000 display vectors. The strict 2000–2100 UTC window and reference-epoch fallback never depend on the visitor's clock. Earth texture and provenance are local.
9. A planet recipe is a pure function of the source row. No `Math.random()` or time-based texture seed is used. Preview and export receive the same selected row, siblings, recipe, camera, and provenance.

## Continuous scene and scale model

Continuity is one persistent renderer plus reversible, URL-driven state—not one enormous float32 coordinate space. Physical/source coordinates remain numeric CPU data with explicit units. Each view rebuilds a bounded scene around a local origin, applies a documented display transform, and declares observer, scale, and frame. Route state preserves the selected destination, journey origin, Earth-only ISS epoch, selected Solar epoch, and local camera where applicable. ISS and Solar epoch changes update existing objects in place without recreating the renderer, controls, or camera.

- The ISS instrument is optional and Earth-anchored. Satellite.js derives TEME kilometre vectors from one historical OMM; `(x,z,−y)` retains direction, fixed display radius `2.65` around Earth radius `2` exaggerates separation, and a 47-sample local trace is clamped to the declared interaction bounds. On narrow phone screens only, a common `0.74` scale on Earth/atmosphere/ISS objects fits the marker without changing their ratio, camera, or retained physical vector. Closing removes the trace/marker and restores ordinary Earth display scale.
- Solar source positions are geometric heliocentric EQJ/J2000 au at the selected UTC epoch, defaulting to `2026-11-26T00:00:00.000Z`. The interface documents Astronomy Engine's UT1≈UTC input approximation and internally derived TT. `Rotation_EQJ_ECL()` supplies display-only ecliptic coordinates; logarithmic radial compression and enlarged bodies are disclosed. This eight-planet model contains no satellites and applies no light-time/aberration correction; the ISS is a separate Earth scene, not a ninth-body or satellite extension.
- Gaia RA/Dec supplies ICRS-aligned J2016.0 directions. Bailer–Jones `r_med_geo` supplies heliocentric parsecs and logarithmic display distance; `r_lo_geo` and `r_hi_geo` remain attached to the selected source. No parallax inversion, epoch propagation, or zero-point correction is substituted for the published distance method.
- NASA host RA/Dec and parsecs produce independent archive-relative directions and logarithmic display distances for the larger host overlay and subsequent look-back journey.
- Look-back places the observer along the selected host's archive direction and looks toward the Sun at the local origin. Earth is unresolved; distance is compressed and the result is explicitly schematic.

## URL state

- `planet`: exact catalogue identifier, encoded with `URLSearchParams`.
- `view`: `earth`, `solar`, `neighbourhood`, `atlas`, `system`, `planet`, or `lookback`; absence means Earth. A planet with an unrecognized/non-world view opens its system; selected-only views without a planet normalize to Earth.
- `iss`: strict millisecond ISO UTC instant within the archived source-relative ±12 h window, serialized whenever the ISS instrument is open on Earth. Invalid values fail closed to the source epoch; non-Earth navigation and Close remove it. The exact six-digit OMM epoch remains in the manifest/method sheet rather than being truncated in the source record.
- `epoch`: strict ISO UTC Solar System instant within the declared 2000–2100 window. It is serialized only for non-default Solar System URLs; malformed, normalized-invalid, and out-of-window values fall back to the reference epoch. Exact selected-epoch links reload the same model time.
- `from=atlas`: records an atlas-origin selection. Its absence on a world route means golden-journey/neighbourhood origin, including originless legacy deep links.
- `q` and `filter`: current search/filter state.
- `mode`: `wonder` or `observatory`; legacy `evidence=1` opens Observatory and remains supported.
- `az` and `el`: planet-camera azimuth/elevation in radians, clamped and rounded to three decimals.
- `share`: `portrait`, `field-note`, or `orbital-study`. Share remains a dialog over the encoded world/view rather than becoming a peer destination.

Gaia source inspection is transient local UI state rather than a shareable destination. Legacy `mode=studio` links migrate to `share=portrait`; obsolete `exp`, `comp`, and `crop` values are discarded. There is no standalone Studio mode or designer state. Closing Share removes only `share` and restores the same world, camera, and interpretation context. Navigation pushes user journey steps; search, dialog dismissal, template changes, camera updates, ISS steps, and Solar epoch updates replace history to avoid flooding it. Browser back/forward reparses the URL. Invalid planet names produce a notice and return to the atlas rather than fabricating a record.

## Share rendering

- **Portrait:** 1800 × 2250, artwork-dominant, identity, one available measured/derived fact, concise art/provenance treatment.
- **Field Note:** 2400 × 1800, an editorial scientific plate with up to four facts, measured/derived/imagined explanations, attribution, printed reopen URL, and QR code.
- **Orbital Study:** 2200 × 2200, deterministic fingerprint plus real host/sibling values. Missing fields are omitted; long sibling lists are bounded with the real remaining count disclosed.

The export uses a deterministic 2D-canvas reconstruction rather than capturing WebGL, so full-resolution output is equivalent with reduced motion and without WebGL. Camera angles inform the static illumination. QR generation is locally bundled. The live preview is the actual PNG blob used for download, not a separate approximation.

## Rendering and lifecycle

The engine owns one WebGL renderer. View content is disposed by geometry/material, including the owned Earth texture and closed ISS trace/marker geometries/materials, before rebuilding or after outgoing crossfades. ResizeObserver updates aspect, render size, and Earth/ISS/planet framing. Low-power mode uses lower pixel ratio and geometry density. `webglcontextlost` or initialization failure switches to static views, including an equivalent ISS SVG marker and trace. The animation loop skips hidden documents. Decorative random starfields are not used; visible atlas and neighbourhood points are catalogue-derived. The neighbourhood method sheet disables its ancestor's transform animation so fixed positioning remains viewport-relative, and has bounded geometry plus explicit dismissal on desktop and mobile.

For WebGL validation only, `window.__OTHER_WORLDS__` exposes scene readiness, view, counts, FPS, draw calls, triangles, `issEpoch`, `solarEpoch`, camera/target coordinates, and transition state. The browser runner uses this as an observable readiness and camera-continuity signal rather than guessing from a fixed delay alone. `.scene-canvas.dataset.issEpoch` and `dataset.issTemeKm` expose the selected instant and derived physical vector for independent propagation checks; `.scene-canvas.dataset.solarEpoch` exposes Solar time immediately. Static ISS retains `data-teme-km`, and static Solar bodies retain `data-eqj-au` and `data-ecl-au`. No-WebGL contexts wait for the actual static scene and `data-view`, because no renderer exists to emit renderer diagnostics.

## Build shape

Vite emits a portable static `dist/` with `base: './'`. Fonts, Earth imagery, QR generation, the ISS manifest, reference Solar System snapshot, Gaia manifest, and NASA data are local. Pinned satellite.js and Astronomy Engine are bundled for selected-epoch runtime computation and also used by reproducible offline generators/validators. The ISS runtime imports satellite.js's pure ESM `dist/io.js` and `dist/propagation/propagate.js` calculation modules because the package root also exports optional WASM workers whose top-level-await shape is incompatible with this IIFE bundle. Three.js and the shader renderer remain in the initial chunk; Vite's large-chunk warning and measured bundle sizes are recorded in `docs/VALIDATION.md` rather than suppressed.
