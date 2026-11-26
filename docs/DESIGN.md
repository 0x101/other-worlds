# Visual and motion system

## Direction

A quiet deep-space observatory with editorial typography. The interface frames one continuous Earth-to-home journey instead of turning it into a card grid or leading with catalogue statistics.

- **Type:** Instrument Serif for place names and narrative statements; Manrope for controls, measurements, and provenance. Both are self-hosted open fonts.
- **Color:** tinted near-black green, warm off-white, restrained sage, and a small sand/amber accent. OKLCH primitive tokens feed semantic surface, text, accent, and line tokens.
- **Composition:** asymmetric editorial copy on the left; Earth, the Solar System, nearby hosts, an orrery, or a planet carries the visual center. Controls sit at the edges and recede during inspection. Mobile reflows the same scenes rather than replacing them with separate demos.
- **Signature detail:** the warm orbital mark and fine orbit lines connect the brand, atlas, system, portrait, and return-home marker. The opening Earth's real composite texture distinguishes home from imagined exoplanet surfaces.

## Scene language

- Earth opens the experience with an unmistakable You Are Here frame and a locally bundled NASA Blue Marble composite, explicitly not live clouds.
- The Solar System uses eight modelled positions at one explicit instant. The planets, enlarged glyphs, logarithmic distance rings, and Earth marker form a readable family portrait without pretending to be a to-scale orrery.
- The interim neighbourhood contains real exoplanet-host directions only. It is labeled as a NASA archive subset, not Gaia or a complete stellar census.
- Atlas points represent real host systems, not random catalogue entries. RA/Dec and logarithmically compressed distance inform positions when present.
- The exoplanet system is an orrery with eccentricity-influenced ellipses, deterministic phases, and a highlighted selected world. Distances and body sizes are intentionally compressed.
- Planet portraits use function-generated shader noise. Gas and ice giants use warped atmospheric bands and deterministic storm systems; sub-Neptune worlds use layered cloud decks and currents; unresolved worlds use a restrained cloud veil; only rocky worlds receive terrain-like color relief. Hot rocky worlds may include explicitly illustrative emissive fractures.
- An atmosphere rim, directional terminator, relief-sensitive lighting, stellar color, and restrained glow provide depth. No external exoplanet artwork or logos are used.
- Atlas cores are compact, with a separate low-opacity halo for multi-planet systems. Every stop shares one renderer and scene lifecycle. Decorative random starfields were removed so they cannot be mistaken for catalogue stars.
- Look-back faces the Sun from the selected host's archive direction. Earth remains unresolved; the quiet home marker and schematic disclosure carry the emotional return without fabricating an observed image.
- A CSS composition remains behind the canvas, and complete static journey scenes prevent WebGL failure from leaving a black rectangle.

## Rendered iteration record

The same production route and deterministic camera were captured at 1440 × 960 and 375 × 812 with `scripts/capture-references.mjs`. The reference set is TRAPPIST-1 e, 55 Cnc e, Kepler-10 b, HD 189733 b, K2-18 b, and KIC 10001893 b. Kepler-10 b joined after the first pass to represent a genuinely hot rocky world; 55 Cnc e remains in the application's transparent derived sub-Neptune class.

Four captured passes are retained under `evidence/round-1/` through `evidence/round-4/`; each manifest records exact URLs, viewport dimensions, renderer metrics, console/page/network errors, and owned-server shutdown. The frames, not only shader compilation, were inspected.

- **Round 1 → 2:** softened overregular giant bands and overexposure; normalized portrait framing by radius and viewport; reduced atlas core size; added multi-system halos; replaced abrupt scene removal with interruptible travel and outgoing crossfades.
- **Round 2 → 3:** separated sub-Neptune currents from unresolved cloud veils; reduced hot-rock fracture coverage; softened giant-band contrast; increased atlas legibility; added Kepler-10 b to the reference set.
- **Round 3 → 4:** restricted emissive fractures to broad hot provinces; removed the bullseye-like storm artifact; opened gaps in K2-18 b's cloud deck so the darker lower layer remains visible.

Round 4 contains 10 valid production frames with zero console errors, page errors, or failed responses. Its desktop software-Chromium samples are diagnostic only (15–20 FPS in the close portrait; 46 FPS in the atlas), not physical-device measurements. Mobile captures use the low-power geometry path.

## Share compositions

Share is a focused dialog over the current world, not another destination. It offers three finished layouts without customization controls:

- **Portrait:** a tall, artwork-dominant plate with world/host identity, one available measured or transparently derived fact, and restrained provenance.
- **Field Note:** a split dark/light scientific plate with a small fact set, explicit measured/derived/imagined treatment, attribution, printed reopen link, and QR code.
- **Orbital Study:** a square system portrait led by the deterministic orbital fingerprint, with real host and sibling values and an adjacent disclosure of log-period radial mapping, eccentricity squash, unknown-value marks, deterministic phases, and compressed scales.

The same near-black green, warm paper, Instrument Serif, Manrope, and fine-line language connects all three. The live preview displays the actual export blob. Portrait and Field Note reuse the selected world recipe and saved camera; Orbital Study reuses the system fingerprint shown in the journey. PNG export is a static 2D renderer, so it does not depend on WebGL or motion.

## Motion

- View changes use a 1.7 s eased camera interpolation and a brief scene veil.
- UI hover, focus, panel, and search transitions are short and interruptible; only transform and opacity are animated.
- Atlas auto-rotation is slow and disabled for reduced motion. The close planet has no time-dependent texture rotation, so identical state reproduces the same world and camera.
- `prefers-reduced-motion` removes CSS animation, scene auto-rotation, damping, and camera tweens. Destinations remain immediately usable.
- Mobile removes the planet-intro transform animation because it otherwise creates a containing block for fixed back navigation; a browser regression check covers this.

## Responsive and accessible behavior

- Semantic HTML carries all names, values, controls, and evidence independently of WebGL.
- Search and system sibling buttons are DOM alternatives to 3D picking.
- The primary mobile action is at least 44 px high; filters remain horizontally scrollable inside their own dock rather than overflowing the page.
- Visible focus rings, Escape/backdrop/close-button dismissal, empty results, status announcements, and retryable errors are included.
- The static fallback preserves selection, evidence, and sharing even when WebGL cannot initialize.
