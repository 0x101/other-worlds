# Visual and motion system

## Direction

A quiet deep-space observatory with editorial typography. The interface frames the scene instead of turning it into a card grid.

- **Type:** Instrument Serif for world names and the opening statement; Manrope for controls, measurements, and provenance. Both are self-hosted open fonts.
- **Color:** tinted near-black green, warm off-white, restrained sage, and a small sand/amber accent. OKLCH primitive tokens feed semantic surface, text, accent, and line tokens.
- **Composition:** asymmetric editorial copy on the left; the atlas, orrery, or planet carries the visual center. Controls sit at the edges and recede during inspection.
- **Signature detail:** the warm orbital mark and fine orbit lines connect the brand, atlas, system, and portrait without illustration assets.

## Scene language

- Atlas points represent real host systems, not random catalogue entries. RA/Dec and logarithmically compressed distance inform positions when present.
- The system is an orrery with eccentricity-influenced ellipses, deterministic phases, and a highlighted selected world. Distances and body sizes are intentionally compressed.
- Planet portraits use function-generated shader noise. Gas and ice giants use atmospheric bands; sub-Neptune and unknown worlds use clouds; only rocky worlds receive terrain-like color relief.
- An atmosphere rim, directional terminator, stellar color, and restrained glow provide depth. No external planet artwork or logos are used.
- A CSS composition remains behind the canvas so startup or WebGL failure never leaves a black rectangle.

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
