# Credits

- **Catalogue:** NASA Exoplanet Archive `pscomppars`, retrieved through the archive TAP service. Data courtesy of the NASA Exoplanet Archive, operated by the California Institute of Technology under contract with NASA. Exact request and timestamp are in `public/data/provenance.json`.
- **Solar System model:** Astronomy Engine 2.1.19, MIT License, Astronomy Engine authors. `scripts/build-solar-snapshot.mjs` uses `HelioVector` and `Rotation_EQJ_ECL()`; the generated snapshot retains the exact version, epoch, source frame, units, and transformation.
- **Earth composite:** NASA Blue Marble imagery as packaged in the pinned Three.js `r180` examples, retrieved from `https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/textures/planets/earth_atmos_2048.jpg`. It is composite imagery, not a live cloud view. NASA imagery is used with source attribution; no NASA endorsement or logo use is implied.
- **Instrument Serif:** Copyright 2022 The Instrument Serif Project Authors; SIL Open Font License 1.1. Distributed locally through Fontsource.
- **Manrope:** Copyright 2019 The Manrope Project Authors; SIL Open Font License 1.1. Distributed locally through Fontsource.
- **Three.js:** MIT License, Three.js authors. Rendering library, OrbitControls, and the packaged Earth texture source distribution.
- **Lucide icons:** ISC License.
- **QRCode / node-qrcode:** Copyright 2012 Ryan Day; MIT License. Generates local QR images containing exact reopen links.
- **React, Vite, TypeScript, Vitest, Playwright, and other dependencies:** their respective licenses in the installed packages and lockfile.

Exoplanet surfaces, atmospheric textures, orbital lines, atlas/neighbourhood points, fallback art, and the favicon are generated in code. The Earth composite is the sole external photographic image asset shipped in this slice; it is sourced and disclosed above. No third-party exoplanet artwork or NASA logo is shipped.
