# Product vision

## Promise

**Every confirmed exoplanet becomes a place to enter, while the distinction between evidence and imagination remains visible.** Other Worlds is an exploratory field atlas, not a metrics dashboard, game, or claim to show what these worlds actually look like.

## Vertical-slice journey

1. **Observed sky.** A responsive Three.js atlas places one selectable point per real host system. The opening frame favors scale, quiet, and legibility over controls.
2. **Real system.** Search, filters, atlas picking, and keyboard-accessible DOM alternatives select a catalogue planet. The host view shows all siblings present in the snapshot.
3. **Approach.** A deliberate camera transition moves from the compressed system orrery to a close planet portrait.
4. **Deterministic world.** The planet identifier seeds the reconstruction. Archive radius, mass, temperature, insolation, and stellar temperature inform class, scale, palette, illumination, and atmospheric treatment.
5. **Evidence.** The inspector names source fields, exposes calculations, and explicitly labels artistic decisions. Missing values remain `Unknown`.
6. **Return and share.** Back navigation preserves context; URLs reopen the selected world, view, filters, evidence state, and camera orientation.

## Scope deliberately shipped

- One polished continuous journey across desktop and mobile.
- A bundled, reproducible full-table snapshot rather than a fragile live-data dependency.
- Rocky, sub-Neptune, ice-giant, gas-giant, and unknown treatments. Only the rocky treatment uses terrain-like shading.
- Search plus six useful filter states, including `All worlds`.
- Scientific caveats adjacent to the experience rather than hidden in a separate report.
- Resilient loading, error, reduced-motion, low-power, and no-WebGL states.

## Non-goals for this run

- No accounts, favorites database, multiplayer, game loop, missions, or scoring.
- No live orbital ephemeris, sky-time selector, exoplanet habitability score, or claimed atmospheric composition.
- No postcard generator; the core journey and sharing took priority.
- No public deployment. The deliverable is the local static application and repository checkpoint.
