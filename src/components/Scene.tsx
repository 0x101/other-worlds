import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraViewState, Catalogue, PlanetRow, ViewName } from '../types';
import { displayOrbit, generateWorld, seededRandom } from '../lib/world';
import { hashString, skyPosition } from '../lib/catalogue';
import { hostColor, lookBackGeometry, nearbyHosts, solarDisplayBodies } from '../lib/goldenPath';
import { GAIA_BY_ID, GAIA_NEIGHBOURHOOD, gaiaDisplayColour, gaiaStateAt, type GaiaStar } from '../lib/gaia';
import { issStateAt, issTraceAt } from '../lib/iss';
import { moonStateAt, moonTraceAt } from '../lib/moon';

interface SceneProps {
  catalogue: Catalogue;
  view: ViewName;
  planet: PlanetRow | null;
  cameraState: CameraViewState;
  solarEpoch: string;
  issEpoch: string | null;
  moonEpoch: string | null;
  gaiaYearOffset: number;
  reducedMotion: boolean;
  lowPower: boolean;
  onSelect: (planet: PlanetRow) => void;
  onGaiaSelect: (star: GaiaStar) => void;
  onCameraChange: (camera: CameraViewState) => void;
  onReady: () => void;
  onFailure: () => void;
}

interface EngineCallbacks {
  onSelect: (planet: PlanetRow) => void;
  onGaiaSelect: (star: GaiaStar) => void;
  onCameraChange: (camera: CameraViewState) => void;
  onFailure: () => void;
}

const vertexShader = `
  varying vec3 vObjectPosition;
  varying vec3 vWorldNormal;
  varying vec3 vViewDirection;
  void main() {
    vObjectPosition = position;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vViewDirection = normalize(cameraPosition - worldPosition.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform vec3 uLightColor;
  uniform vec3 uLightDirection;
  uniform float uIllumination;
  uniform float uNoiseScale;
  uniform float uBandCount;
  uniform float uSeed;
  uniform float uCloudCover;
  uniform float uRelief;
  uniform float uStorminess;
  uniform float uHeat;
  uniform int uSurface;
  varying vec3 vObjectPosition;
  varying vec3 vWorldNormal;
  varying vec3 vViewDirection;

  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x), mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x), mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z
    );
  }
  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.55;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise3(p);
      p = p * 2.03 + vec3(7.1, 3.4, 5.7);
      amplitude *= 0.48;
    }
    return value;
  }
  void main() {
    vec3 p = normalize(vObjectPosition);
    vec3 offset = vec3(uSeed * 0.000013, uSeed * 0.000021, uSeed * 0.000008);
    float broad = fbm(p * uNoiseScale + offset);
    float fine = fbm(p * uNoiseScale * 3.4 - offset);
    float height = broad;
    vec3 albedo;
    vec3 emission = vec3(0.0);
    if (uSurface == 0) {
      float warp = fbm(p * 2.2 + offset * 0.37);
      float provinces = fbm(p * uNoiseScale + vec3(warp * 0.72) + offset);
      float ridges = 1.0 - abs(2.0 * noise3(p * 24.0 + offset) - 1.0);
      height = provinces * 0.76 + fine * 0.18 + ridges * 0.06;
      albedo = mix(uColorA, uColorB, smoothstep(0.3, 0.68, provinces));
      albedo = mix(albedo, uColorC, smoothstep(0.67, 0.91, fine) * 0.38);
      albedo *= 0.76 + ridges * 0.36;
      float fracture = pow(1.0 - abs(2.0 * fbm(p * 8.0 + offset) - 1.0), 22.0);
      float lava = fracture * smoothstep(0.35, 0.82, uHeat) * smoothstep(0.58, 0.78, broad);
      albedo = mix(albedo, uColorC * 1.12, lava * 0.24);
      emission = uColorC * lava * uHeat * 0.38;
    } else if (uSurface == 1 || uSurface == 3) {
      float flow = fbm(vec3(p.x * 3.0, p.y * 2.2, p.z * 3.0) + offset);
      float streaks = fbm(vec3(p.x * 7.0, p.y * 30.0, p.z * 7.0) - offset);
      float ice = uSurface == 3 ? 1.0 : 0.0;
      float distortion = mix(0.72, 0.12, ice) * (0.65 + uStorminess * 0.65);
      float bands = sin((p.y + (flow - 0.5) * distortion + (broad - 0.5) * 0.14) * uBandCount * 6.28318);
      float bandMask = smoothstep(-1.15, 1.15, bands + (streaks - 0.5) * 0.68);
      albedo = mix(uColorA, uColorB, 0.32 + bandMask * 0.54);
      albedo = mix(albedo, uColorC, smoothstep(0.62, 0.94, fine) * mix(0.24, 0.14, ice));
      vec3 stormCenter = normalize(vec3(0.48, -0.2 + uStorminess * 0.42, 0.82));
      float stormDistance = length((p - stormCenter) * vec3(1.15, 3.3, 1.15)) + (flow - 0.5) * 0.045;
      float storm = (1.0 - smoothstep(0.035, 0.32, stormDistance)) * (1.0 - ice) * (0.38 + uStorminess * 0.62);
      float stormBands = 0.82 + streaks * 0.3 + 0.05 * sin(stormDistance * 75.0 + streaks * 4.0);
      albedo = mix(albedo, uColorC * stormBands * (0.9 + streaks * 0.3), storm * 0.42);
      height = bandMask * 0.28 + streaks * 0.36 + storm * 0.12;
    } else {
      float billow = fbm(p * uNoiseScale * 1.15 + vec3(broad * 0.55) + offset);
      float cloudMask = smoothstep(0.64 - uCloudCover * 0.18, 0.91 - uCloudCover * 0.08, billow + fine * 0.1);
      if (uSurface == 4) {
        float current = fbm(vec3(p.x * 4.2, p.y * 12.0, p.z * 4.2) + offset);
        float folds = fbm(p * uNoiseScale * 1.8 + vec3(current * 0.9, broad * 0.4, current * 0.6));
        float deck = smoothstep(0.25, 0.74, folds + current * 0.18);
        albedo = mix(uColorA * 0.64, uColorB * 0.86, deck);
        albedo = mix(albedo, uColorC * (0.62 + current * 0.24), cloudMask * (0.52 + current * 0.2));
        albedo *= 0.82 + fine * 0.32;
        height = deck * 0.38 + cloudMask * 0.4 + fine * 0.12;
      } else if (uSurface == 5) {
        float veil = smoothstep(0.3, 0.78, broad + fine * 0.16);
        albedo = mix(uColorA * 0.7, uColorB * 0.72, veil);
        albedo = mix(albedo, uColorC * 0.76, cloudMask * 0.38);
        height = veil * 0.24 + cloudMask * 0.18;
      } else {
        float veil = smoothstep(0.32, 0.76, broad);
        albedo = mix(uColorA * 0.7, uColorB * 0.88, veil);
        albedo = mix(albedo, uColorC * 0.92, cloudMask * 0.68);
        albedo *= 0.84 + fine * 0.28;
        height = cloudMask * 0.5 + fine * 0.18;
      }
    }
    vec3 geometricNormal = normalize(vWorldNormal);
    float reliefWeight = uSurface == 0 ? uRelief * 1.35 : (uSurface == 1 ? 0.08 : 0.035);
    vec3 normal = normalize(geometricNormal + vec3(dFdx(height), dFdy(height), 0.0) * reliefWeight);
    float ndl = dot(normal, normalize(uLightDirection));
    float geometricLight = dot(geometricNormal, normalize(uLightDirection));
    float terminator = smoothstep(-0.16, 0.3, geometricLight);
    float diffuse = max(ndl, 0.0);
    float light = 0.035 + terminator * (0.21 + diffuse * 0.92) * uIllumination;
    float rim = pow(1.0 - max(dot(geometricNormal, normalize(vViewDirection)), 0.0), 4.0);
    vec3 color = albedo * light * uLightColor + uColorB * rim * 0.035 + emission;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const atmosphereVertex = `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const atmosphereFragment = `
  uniform vec3 uColor;
  uniform float uStrength;
  uniform vec3 uLightDirection;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 3.2);
    float illumination = 0.1 + 0.9 * smoothstep(-0.35, 0.55, dot(normalize(vNormal), normalize(uLightDirection)));
    gl_FragColor = vec4(uColor, fresnel * uStrength * illumination);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function circleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,.95)');
  gradient.addColorStop(0.48, 'rgba(255,255,255,.35)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function disposeGroup(group: THREE.Group): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  group.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
      geometries.add(object.geometry);
      const values = Array.isArray(object.material) ? object.material : [object.material];
      values.forEach((material) => materials.add(material));
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => {
    (material.userData.ownedTexture as THREE.Texture | undefined)?.dispose();
    material.dispose();
  });
  group.clear();
}

class WorldEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(46, 1, 0.1, 500);
  private controls: OrbitControls;
  private content = new THREE.Group();
  private departing: { group: THREE.Group; started: number }[] = [];
  private currentView: ViewName = 'earth';
  private currentPlanet: PlanetRow | null = null;
  private currentSolarEpoch = '';
  private currentIssEpoch: string | null = null;
  private currentMoonEpoch: string | null = null;
  private currentGaiaYearOffset = 0;
  private catalogue: Catalogue;
  private callbacks: EngineCallbacks;
  private reducedMotion: boolean;
  private lowPower: boolean;
  private spriteTexture = circleTexture();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private pointerStart = new THREE.Vector2();
  private resizeObserver: ResizeObserver;
  private planetDistance = 7.4;
  private transition: { started: number; from: THREE.Vector3; to: THREE.Vector3; targetFrom: THREE.Vector3; targetTo: THREE.Vector3 } | null = null;
  private ready = false;
  private frameCount = 0;
  private frameWindowStart = performance.now();

  constructor(private container: HTMLDivElement, catalogue: Catalogue, callbacks: EngineCallbacks, reducedMotion: boolean, lowPower: boolean) {
    this.catalogue = catalogue;
    this.callbacks = callbacks;
    this.reducedMotion = reducedMotion;
    this.lowPower = lowPower;
    this.renderer = new THREE.WebGLRenderer({ antialias: !lowPower, alpha: true, powerPreference: lowPower ? 'low-power' : 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1 : 1.75));
    this.renderer.setClearColor(0x080d0e, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.renderer.domElement.tabIndex = -1;
    container.appendChild(this.renderer.domElement);
    this.scene.fog = new THREE.FogExp2(0x080d0e, 0.0065);
    this.scene.add(this.content);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !reducedMotion;
    this.controls.dampingFactor = 0.055;
    this.controls.enablePan = false;
    this.controls.minDistance = 4.5;
    this.controls.maxDistance = 80;
    this.controls.rotateSpeed = 0.45;
    this.controls.zoomSpeed = 0.65;
    this.controls.addEventListener('start', () => { this.transition = null; });
    this.controls.addEventListener('end', () => this.emitCamera());
    this.camera.position.set(0, 0.45, 7.8);
    this.controls.target.set(0, 0, 0);
    this.bindPointer();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost);
    this.renderer.setAnimationLoop(() => this.animate());
  }

  private contextLost = (event: Event) => {
    event.preventDefault();
    this.callbacks.onFailure();
  };

  private bindPointer(): void {
    this.renderer.domElement.addEventListener('pointerdown', (event) => this.pointerStart.set(event.clientX, event.clientY));
    this.renderer.domElement.addEventListener('pointerup', (event) => {
      if (this.pointerStart.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 6) return;
      const bounds = this.renderer.domElement.getBoundingClientRect();
      this.pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      this.raycaster.params.Points.threshold = this.currentView === 'atlas' ? 0.55 : this.currentView === 'neighbourhood' ? 0.45 : 0.2;
      const intersections = this.raycaster.intersectObjects(this.content.children, true);
      let gaiaStar: GaiaStar | undefined;
      for (const intersection of intersections) {
        if (intersection.object instanceof THREE.Points && intersection.index !== undefined && (this.currentView === 'atlas' || this.currentView === 'neighbourhood')) {
          const names = intersection.object.userData.systems as string[] | undefined;
          const host = names?.[intersection.index];
          const planet = host ? this.catalogue.systems.get(host)?.[0] : undefined;
          if (planet) { this.callbacks.onSelect(planet); return; }
          const stars = intersection.object.userData.gaiaStars as GaiaStar[] | undefined;
          if (this.currentView === 'neighbourhood' && stars?.[intersection.index]) gaiaStar ??= stars[intersection.index];
        }
        const name = intersection.object.userData.planetName as string | undefined;
        if (name) {
          const planet = this.catalogue.byName.get(name);
          if (planet) { this.callbacks.onSelect(planet); return; }
        }
      }
      if (gaiaStar) this.callbacks.onGaiaSelect(gaiaStar);
    });
  }

  private buildEarth(): void {
    const centerX = this.container.clientWidth < 700 ? 0 : 1.05;
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
    const texture = new THREE.TextureLoader().load(
      `${import.meta.env.BASE_URL}textures/earth-blue-marble.jpg`,
      () => { material.needsUpdate = true; },
      undefined,
      () => { material.map = null; material.color.set(0x416d78); material.needsUpdate = true; },
    );
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    material.map = texture;
    material.userData.ownedTexture = texture;
    const globe = new THREE.Mesh(new THREE.SphereGeometry(2, this.lowPower ? 64 : 96, this.lowPower ? 48 : 64), material);
    globe.name = 'earth-globe';
    globe.position.x = centerX;
    globe.rotation.y = -Math.PI / 2;
    this.content.add(globe);
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.055, this.lowPower ? 48 : 80, this.lowPower ? 32 : 56),
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        uniforms: {
          uColor: { value: new THREE.Color(0x76b7d0) },
          uStrength: { value: 0.34 },
          uLightDirection: { value: new THREE.Vector3(-0.7, 0.38, 0.85).normalize() },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    atmosphere.name = 'earth-atmosphere';
    atmosphere.position.x = centerX;
    this.content.add(atmosphere);
    this.content.add(new THREE.AmbientLight(0x9db5b4, 0.28));
    const sunlight = new THREE.DirectionalLight(0xfff1da, 3.2);
    sunlight.position.set(-4, 2.5, 5);
    this.content.add(sunlight);
    if (this.currentIssEpoch) this.buildIss();
    if (this.currentMoonEpoch) this.buildMoon();
    this.updateEarthDisplayScale();
  }

  private updateEarthDisplayScale(): void {
    // Fit each expedition with one common Earth/orbit scale; never move the camera to fake a direction.
    const mobile = this.container.clientWidth < 700;
    const scale = this.currentMoonEpoch ? (mobile ? 0.48 : 0.82) : mobile && this.currentIssEpoch ? 0.74 : 1;
    for (const name of ['earth-globe', 'earth-atmosphere', 'iss-expedition', 'moon-expedition']) {
      this.content.getObjectByName(name)?.scale.setScalar(scale);
    }
  }

  private buildIss(): void {
    if (!this.currentIssEpoch || this.content.getObjectByName('iss-expedition')) return;
    const group = new THREE.Group();
    group.name = 'iss-expedition';
    group.position.x = this.container.clientWidth < 700 ? 0 : 1.05;
    const trace = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xc3b18e, transparent: true, opacity: 0.34, depthWrite: false }),
    );
    trace.name = 'iss-derived-trace';
    group.add(trace);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), new THREE.MeshBasicMaterial({ color: 0xf4d7a1 }));
    marker.name = 'iss-derived-marker';
    group.add(marker);
    const markerRing = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 8, 40), new THREE.MeshBasicMaterial({ color: 0xdac39e, transparent: true, opacity: 0.8, depthWrite: false }));
    markerRing.name = 'iss-derived-marker-ring';
    group.add(markerRing);
    this.content.add(group);
    this.updateIssGroup(group);
  }

  private updateIssGroup(group: THREE.Group): void {
    if (!this.currentIssEpoch) return;
    const state = issStateAt(this.currentIssEpoch);
    const position = new THREE.Vector3(state.displayPosition.x, state.displayPosition.y, state.displayPosition.z);
    this.content.getObjectByName('iss-derived-marker')?.position.copy(position);
    this.content.getObjectByName('iss-derived-marker-ring')?.position.copy(position);
    const trace = this.content.getObjectByName('iss-derived-trace');
    if (trace instanceof THREE.Line) trace.geometry.setFromPoints(issTraceAt(this.currentIssEpoch).map((point) => new THREE.Vector3(point.x, point.y, point.z)));
    group.userData.temeKm = state.temeKm;
    this.container.dataset.issTemeKm = state.temeKm.join(',');
  }

  setIssEpoch(epoch: string | null): void {
    this.currentIssEpoch = epoch;
    if (epoch) this.container.dataset.issEpoch = epoch;
    else {
      delete this.container.dataset.issEpoch;
      delete this.container.dataset.issTemeKm;
    }
    if (this.currentView !== 'earth') return;
    const group = this.content.getObjectByName('iss-expedition');
    if (!epoch) {
      if (group instanceof THREE.Group) {
        this.content.remove(group);
        disposeGroup(group);
      }
      this.updateEarthDisplayScale();
      return;
    }
    if (group instanceof THREE.Group) this.updateIssGroup(group);
    else this.buildIss();
    this.updateEarthDisplayScale();
  }

  private buildMoon(): void {
    if (!this.currentMoonEpoch || this.content.getObjectByName('moon-expedition')) return;
    const group = new THREE.Group();
    group.name = 'moon-expedition';
    group.position.x = this.container.clientWidth < 700 ? 0 : 1.05;
    const trace = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xb9b8ae, transparent: true, opacity: 0.38, depthWrite: false }),
    );
    trace.name = 'moon-derived-trace';
    group.add(trace);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.24, 28, 20), new THREE.MeshStandardMaterial({ color: 0xd9d4c7, roughness: 1, metalness: 0 }));
    marker.name = 'moon-derived-marker';
    group.add(marker);
    const markerRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.012, 8, 48), new THREE.MeshBasicMaterial({ color: 0xc7c4b8, transparent: true, opacity: 0.72, depthWrite: false }));
    markerRing.name = 'moon-derived-marker-ring';
    group.add(markerRing);
    this.content.add(group);
    this.updateMoonGroup(group);
  }

  private updateMoonGroup(group: THREE.Group): void {
    if (!this.currentMoonEpoch) return;
    const state = moonStateAt(this.currentMoonEpoch);
    const position = new THREE.Vector3(state.displayPosition.x, state.displayPosition.y, state.displayPosition.z);
    this.content.getObjectByName('moon-derived-marker')?.position.copy(position);
    this.content.getObjectByName('moon-derived-marker-ring')?.position.copy(position);
    const trace = this.content.getObjectByName('moon-derived-trace');
    if (trace instanceof THREE.Line) trace.geometry.setFromPoints(moonTraceAt(this.currentMoonEpoch).map((point) => new THREE.Vector3(point.x, point.y, point.z)));
    group.userData.eqjAu = state.eqjAu;
    group.userData.eclipticAu = state.eclipticAu;
    this.container.dataset.moonEqjAu = state.eqjAu.join(',');
    this.container.dataset.moonEclAu = state.eclipticAu.join(',');
  }

  setMoonEpoch(epoch: string | null): void {
    this.currentMoonEpoch = epoch;
    if (epoch) this.container.dataset.moonEpoch = epoch;
    else {
      delete this.container.dataset.moonEpoch;
      delete this.container.dataset.moonEqjAu;
      delete this.container.dataset.moonEclAu;
    }
    if (this.currentView !== 'earth') return;
    const group = this.content.getObjectByName('moon-expedition');
    if (!epoch) {
      if (group instanceof THREE.Group) {
        this.content.remove(group);
        disposeGroup(group);
      }
      this.updateEarthDisplayScale();
      return;
    }
    if (group instanceof THREE.Group) this.updateMoonGroup(group);
    else this.buildMoon();
    this.updateEarthDisplayScale();
  }

  private buildSolar(): void {
    const sun = new THREE.Mesh(new THREE.SphereGeometry(1.05, 48, 32), new THREE.MeshBasicMaterial({ color: 0xe7c28d }));
    this.content.add(sun);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.spriteTexture, color: 0xe7c28d, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(8);
    this.content.add(glow);
    this.content.add(new THREE.AmbientLight(0x91a49c, 0.3));
    this.content.add(new THREE.PointLight(0xffe0ae, 240, 120, 1.4));
    for (const body of solarDisplayBodies(this.currentSolarEpoch)) {
      const ring = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, body.displayRadius, body.displayRadius, 0, Math.PI * 2).getPoints(180).map((point) => new THREE.Vector3(point.x, 0, point.y))),
        new THREE.LineBasicMaterial({ color: body.name === 'Earth' ? 0xc3b18e : 0x75847c, transparent: true, opacity: body.name === 'Earth' ? 0.2 : 0.075 }),
      );
      ring.name = `solar-ring-${body.name.toLowerCase()}`;
      ring.userData.displayRadius = body.displayRadius;
      this.content.add(ring);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(body.radius, this.lowPower ? 20 : 32, this.lowPower ? 14 : 22),
        new THREE.MeshStandardMaterial({ color: body.color, roughness: 0.88, metalness: 0.01 }),
      );
      mesh.name = `solar-${body.name.toLowerCase()}`;
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      this.content.add(mesh);
      if (body.name === 'Earth') {
        const marker = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.018, 8, 64), new THREE.MeshBasicMaterial({ color: 0xdac39e, transparent: true, opacity: 0.85 }));
        marker.name = 'solar-earth-marker';
        marker.position.copy(mesh.position);
        marker.rotation.x = Math.PI / 2;
        this.content.add(marker);
      }
    }
  }

  setSolarEpoch(epoch: string): void {
    this.currentSolarEpoch = epoch;
    this.container.dataset.solarEpoch = epoch;
    if (this.currentView !== 'solar') return;
    for (const body of solarDisplayBodies(epoch)) {
      const mesh = this.content.getObjectByName(`solar-${body.name.toLowerCase()}`);
      mesh?.position.set(body.position.x, body.position.y, body.position.z);
      const ring = this.content.getObjectByName(`solar-ring-${body.name.toLowerCase()}`);
      if (ring) ring.scale.setScalar(body.displayRadius / (ring.userData.displayRadius as number));
      if (body.name === 'Earth') this.content.getObjectByName('solar-earth-marker')?.position.set(body.position.x, body.position.y, body.position.z);
    }
  }

  private buildNeighbourhood(): void {
    const stars = GAIA_NEIGHBOURHOOD.stars;
    const gaiaPositions = new Float32Array(stars.length * 3);
    const gaiaColors = new Float32Array(stars.length * 3);
    stars.forEach((star, index) => {
      const position = gaiaStateAt(star, this.currentGaiaYearOffset).displayPosition;
      const color = new THREE.Color(gaiaDisplayColour(star.bp_rp));
      gaiaPositions.set([position.x, position.y, position.z], index * 3);
      gaiaColors.set([color.r, color.g, color.b], index * 3);
    });
    const gaiaGeometry = new THREE.BufferGeometry();
    gaiaGeometry.setAttribute('position', new THREE.BufferAttribute(gaiaPositions, 3));
    gaiaGeometry.setAttribute('color', new THREE.BufferAttribute(gaiaColors, 3));
    gaiaGeometry.computeBoundingSphere();
    const gaiaPoints = new THREE.Points(gaiaGeometry, new THREE.PointsMaterial({ size: 0.48, map: this.spriteTexture, vertexColors: true, transparent: true, opacity: 0.88, alphaTest: 0.035, depthWrite: false }));
    gaiaPoints.name = 'gaia-dr3-neighbourhood';
    gaiaPoints.userData.gaiaStars = stars;
    this.content.add(gaiaPoints);
    this.updateGaiaDiagnostics(gaiaPoints);

    const hosts = nearbyHosts(this.catalogue);
    const positions = new Float32Array(hosts.length * 3);
    const colors = new Float32Array(hosts.length * 3);
    const names: string[] = [];
    hosts.forEach((host, index) => {
      positions.set([host.position.x, host.position.y, host.position.z], index * 3);
      const color = new THREE.Color(hostColor(host)).lerp(new THREE.Color(0xf1dec0), 0.2);
      colors.set([color.r, color.g, color.b], index * 3);
      names.push(host.planet.hostname);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.82, map: this.spriteTexture, vertexColors: true, transparent: true, opacity: 0.98, alphaTest: 0.035, depthWrite: false }));
    points.name = 'nasa-exoplanet-hosts';
    points.userData.systems = names;
    this.content.add(points);
    this.container.dataset.nasaHostPositions = Array.from(positions, (value) => value.toFixed(9)).join(',');
    const home = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.spriteTexture, color: 0xe5c49a, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    home.scale.setScalar(1.6);
    this.content.add(home);
  }

  private updateGaiaDiagnostics(points?: THREE.Points): void {
    const barnard = GAIA_BY_ID.get('4472832130942575872');
    if (!barnard) return;
    const state = gaiaStateAt(barnard, this.currentGaiaYearOffset);
    const index = GAIA_NEIGHBOURHOOD.stars.indexOf(barnard);
    const attribute = points?.geometry.getAttribute('position');
    const displayPosition = attribute && index >= 0
      ? [attribute.getX(index), attribute.getY(index), attribute.getZ(index)]
      : [state.displayPosition.x, state.displayPosition.y, state.displayPosition.z];
    this.container.dataset.gaiaYearOffset = String(this.currentGaiaYearOffset);
    this.container.dataset.gaiaBarnardRaDeg = String(state.ra);
    this.container.dataset.gaiaBarnardDecDeg = String(state.dec);
    this.container.dataset.gaiaBarnardDisplay = displayPosition.join(',');
  }

  setGaiaYearOffset(offset: number): void {
    this.currentGaiaYearOffset = offset;
    this.container.dataset.gaiaYearOffset = String(offset);
    if (this.currentView !== 'neighbourhood') {
      delete this.container.dataset.gaiaBarnardRaDeg;
      delete this.container.dataset.gaiaBarnardDecDeg;
      delete this.container.dataset.gaiaBarnardDisplay;
      delete this.container.dataset.nasaHostPositions;
      return;
    }
    const points = this.content.getObjectByName('gaia-dr3-neighbourhood');
    if (points instanceof THREE.Points) {
      const attribute = points.geometry.getAttribute('position');
      GAIA_NEIGHBOURHOOD.stars.forEach((star, index) => {
        const position = gaiaStateAt(star, offset).displayPosition;
        attribute.setXYZ(index, position.x, position.y, position.z);
      });
      attribute.needsUpdate = true;
      points.geometry.computeBoundingSphere();
      this.updateGaiaDiagnostics(points);
    } else this.updateGaiaDiagnostics();
  }

  private buildLookback(planet: PlanetRow): void {
    const geometry = lookBackGeometry(planet);
    if (!geometry) return;
    const home = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.spriteTexture, color: 0xf0d7a7, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
    home.name = 'lookback-home';
    home.scale.setScalar(1.75);
    this.content.add(home);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffe4b5 }));
    this.content.add(core);
    const path = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(geometry.camera.x, geometry.camera.y, geometry.camera.z)]),
      new THREE.LineBasicMaterial({ color: 0xc8b48e, transparent: true, opacity: 0.12, depthWrite: false }),
    );
    this.content.add(path);
  }

  setView(view: ViewName, planet: PlanetRow | null, solarEpoch: string, issEpoch: string | null, moonEpoch: string | null, gaiaYearOffset: number): void {
    const instant = this.reducedMotion || !this.ready;
    const previous = this.content;
    this.scene.remove(previous);
    if (instant || !previous.children.length) disposeGroup(previous);
    else {
      previous.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          material.userData.journeyOpacity = material.opacity;
          material.transparent = true;
          material.depthWrite = false;
        });
      });
      this.scene.add(previous);
      this.departing.push({ group: previous, started: performance.now() });
    }
    this.content = new THREE.Group();
    this.scene.add(this.content);
    this.currentView = view;
    this.currentPlanet = planet;
    this.currentIssEpoch = view === 'earth' ? issEpoch : null;
    this.currentMoonEpoch = view === 'earth' ? moonEpoch : null;
    this.setGaiaYearOffset(gaiaYearOffset);
    if (this.currentIssEpoch) this.container.dataset.issEpoch = this.currentIssEpoch;
    else {
      delete this.container.dataset.issEpoch;
      delete this.container.dataset.issTemeKm;
    }
    if (this.currentMoonEpoch) this.container.dataset.moonEpoch = this.currentMoonEpoch;
    else {
      delete this.container.dataset.moonEpoch;
      delete this.container.dataset.moonEqjAu;
      delete this.container.dataset.moonEclAu;
    }
    this.setSolarEpoch(solarEpoch);
    this.controls.autoRotate = view === 'atlas' && !this.reducedMotion;
    this.controls.autoRotateSpeed = 0.12;
    this.controls.enableZoom = view !== 'planet' && view !== 'earth' && view !== 'lookback';
    this.controls.enableRotate = view !== 'lookback';
    this.controls.minDistance = view === 'planet' ? 4.8 : view === 'earth' ? 7.8 : view === 'lookback' ? 42 : view === 'system' ? 12 : view === 'solar' ? 20 : 18;
    this.controls.maxDistance = view === 'planet' ? 20 : view === 'earth' ? 7.8 : view === 'lookback' ? 42 : view === 'system' ? 58 : view === 'solar' ? 110 : 80;
    let destination = new THREE.Vector3(0, 0.45, 7.8);
    const target = new THREE.Vector3(0, 0, 0);
    if (view === 'earth') this.buildEarth();
    else if (view === 'solar') {
      this.buildSolar();
      destination = new THREE.Vector3(0, 34, 46);
    } else if (view === 'neighbourhood') {
      this.buildNeighbourhood();
      destination = new THREE.Vector3(0, 7, 44);
    } else if (view === 'atlas') this.buildAtlas();
    else if (view === 'system' && planet) {
      this.buildSystem(planet);
      destination = new THREE.Vector3(0, 18, 33);
    } else if (view === 'planet' && planet) {
      this.buildPlanet(planet);
      destination = new THREE.Vector3(0, 0.45, this.planetDistance);
    } else if (view === 'lookback' && planet) {
      this.buildLookback(planet);
      const geometry = lookBackGeometry(planet);
      if (geometry) destination = new THREE.Vector3(geometry.camera.x, geometry.camera.y, geometry.camera.z);
    }
    if (instant) {
      this.camera.position.copy(destination);
      this.controls.target.copy(target);
      this.transition = null;
    } else {
      this.transition = { started: performance.now(), from: this.camera.position.clone(), to: destination, targetFrom: this.controls.target.clone(), targetTo: target };
    }
    this.controls.update();
  }

  private buildAtlas(): void {
    const systems = [...this.catalogue.systems.values()];
    const positions = new Float32Array(systems.length * 3);
    const colors = new Float32Array(systems.length * 3);
    const multiplePositions: number[] = [];
    const names: string[] = [];
    systems.forEach((siblings, index) => {
      const representative = siblings[0];
      const point = skyPosition(representative);
      positions.set([point.x, point.y, point.z], index * 3);
      if (siblings.length > 1) multiplePositions.push(point.x, point.y, point.z);
      const world = generateWorld(representative);
      const color = new THREE.Color(world.starColor).lerp(new THREE.Color(0xaebbb1), 0.48);
      colors.set([color.r, color.g, color.b], index * 3);
      names.push(representative.hostname);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: 0.42, map: this.spriteTexture, vertexColors: true, transparent: true, opacity: 0.96, alphaTest: 0.035, depthWrite: false, blending: THREE.NormalBlending });
    const points = new THREE.Points(geometry, material);
    points.userData.systems = names;
    this.content.add(points);
    const multipleGeometry = new THREE.BufferGeometry();
    multipleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(multiplePositions, 3));
    const multiples = new THREE.Points(multipleGeometry, new THREE.PointsMaterial({ size: 0.9, map: this.spriteTexture, color: 0xc5b18c, transparent: true, opacity: 0.21, alphaTest: 0.02, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.content.add(multiples);
    [15, 24, 33].forEach((radius, index) => {
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2);
      const line = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(160).map((point) => new THREE.Vector3(point.x, 0, point.y))),
        new THREE.LineBasicMaterial({ color: 0x789087, transparent: true, opacity: 0.045 }),
      );
      line.rotation.set(0.28 + index * 0.17, 0, index * 0.31);
      this.content.add(line);
    });
    const home = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.spriteTexture, color: 0xe5c49a, transparent: true, opacity: 0.64, depthWrite: false, blending: THREE.AdditiveBlending }));
    home.scale.setScalar(0.78);
    this.content.add(home);
  }

  private buildSystem(selected: PlanetRow): void {
    const siblings = this.catalogue.systems.get(selected.hostname) ?? [selected];
    const starColor = generateWorld(selected).starColor;
    const starRadius = Math.min(1.7, Math.max(0.72, 0.75 + (selected.st_rad ?? 1) * 0.42));
    const star = new THREE.Mesh(new THREE.SphereGeometry(starRadius, 48, 32), new THREE.MeshBasicMaterial({ color: starColor }));
    this.content.add(star);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.spriteTexture, color: starColor, transparent: true, opacity: 0.56, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(starRadius * 7.5);
    this.content.add(glow);
    this.content.add(new THREE.AmbientLight(0x91a49c, 0.24));
    const light = new THREE.PointLight(starColor, 85, 100, 1.5);
    this.content.add(light);
    siblings.forEach((planet, index) => {
      const orbit = displayOrbit(planet, index);
      const seed = hashString(planet.pl_name);
      const random = seededRandom(seed);
      const eccentricity = Math.min(0.82, Math.max(0, planet.pl_orbeccen ?? 0));
      const curve = new THREE.EllipseCurve(0, 0, orbit.radius, orbit.radius * Math.sqrt(1 - eccentricity ** 2), 0, Math.PI * 2);
      const orbitLine = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(160).map((point) => new THREE.Vector3(point.x, 0, point.y))),
        new THREE.LineBasicMaterial({ color: planet.pl_name === selected.pl_name ? 0xc3b18e : 0x75847c, transparent: true, opacity: planet.pl_name === selected.pl_name ? 0.38 : 0.15 }),
      );
      orbitLine.rotation.y = random() * 0.12;
      this.content.add(orbitLine);
      const angle = random() * Math.PI * 2;
      const world = generateWorld(planet);
      const radius = Math.min(0.8, Math.max(0.18, 0.16 + Math.cbrt(planet.pl_rade ?? 1) * 0.17));
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, this.lowPower ? 24 : 40, this.lowPower ? 16 : 28),
        new THREE.MeshStandardMaterial({ color: world.palette[1], roughness: 0.88, metalness: 0.02, emissive: world.palette[0], emissiveIntensity: 0.1 }),
      );
      mesh.position.set(Math.cos(angle) * orbit.radius, 0, Math.sin(angle) * orbit.radius * Math.sqrt(1 - eccentricity ** 2));
      mesh.userData.planetName = planet.pl_name;
      this.content.add(mesh);
      if (planet.pl_name === selected.pl_name) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.75, 0.016, 8, 64), new THREE.MeshBasicMaterial({ color: 0xdac39e, transparent: true, opacity: 0.85 }));
        ring.position.copy(mesh.position);
        ring.rotation.x = Math.PI / 2;
        this.content.add(ring);
      }
    });
  }

  private buildPlanet(planet: PlanetRow): void {
    const world = generateWorld(planet);
    this.planetDistance = world.displayRadius * (this.container.clientWidth < 700 ? 4.8 : 3.85);
    const geometry = new THREE.SphereGeometry(world.displayRadius, this.lowPower ? 56 : 112, this.lowPower ? 36 : 80);
    const surfaceValue = world.kind === 'sub-neptune' ? 4 : world.kind === 'unknown' ? 5 : { terrain: 0, bands: 1, clouds: 2, 'ice-bands': 3 }[world.surface];
    const lightColor = new THREE.Color(world.starColor).lerp(new THREE.Color(0xfff4e4), 0.52);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uColorA: { value: new THREE.Color(world.palette[0]) },
        uColorB: { value: new THREE.Color(world.palette[1]) },
        uColorC: { value: new THREE.Color(world.palette[2]) },
        uLightColor: { value: lightColor },
        uLightDirection: { value: new THREE.Vector3(-0.7, 0.38, 0.85).normalize() },
        uIllumination: { value: world.illumination },
        uNoiseScale: { value: world.noiseScale },
        uBandCount: { value: world.bandCount },
        uSeed: { value: world.seed % 100000 },
        uCloudCover: { value: world.cloudCover },
        uRelief: { value: world.relief },
        uStorminess: { value: world.storminess },
        uHeat: { value: world.heat },
        uSurface: { value: surfaceValue },
      },
    });
    const globe = new THREE.Mesh(geometry, material);
    globe.name = 'portrait-globe';
    globe.position.x = this.container.clientWidth < 700 ? 0 : 1.05;
    globe.rotation.z = world.axialTilt;
    globe.rotation.y = (world.seed % 628) / 100;
    this.content.add(globe);
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(world.displayRadius * 1.025, this.lowPower ? 48 : 80, this.lowPower ? 32 : 56),
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        uniforms: {
          uColor: { value: new THREE.Color(world.atmosphereColor) },
          uStrength: { value: world.atmosphereStrength },
          uLightDirection: { value: new THREE.Vector3(-0.7, 0.38, 0.85).normalize() },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
      }),
    );
    atmosphere.name = 'portrait-atmosphere';
    atmosphere.position.copy(globe.position);
    this.content.add(atmosphere);
    const orbitCurve = new THREE.EllipseCurve(0, 0, world.displayRadius * 1.62, world.displayRadius * 1.62, 0.12, Math.PI * 1.55);
    const orbit = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(orbitCurve.getPoints(180).map((point) => new THREE.Vector3(point.x + globe.position.x, point.y, -world.displayRadius * 0.9))),
      new THREE.LineBasicMaterial({ color: 0xa6b4a9, transparent: true, opacity: 0.12, depthWrite: false }),
    );
    orbit.rotation.z = -0.32;
    this.content.add(orbit);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.spriteTexture, color: world.starColor, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.set(-6, 3.4, -3);
    glow.scale.setScalar(8);
    this.content.add(glow);
  }

  setCamera(state: CameraViewState): void {
    if (this.currentView !== 'planet' || this.transition) return;
    const target = new THREE.Vector3(0, 0, 0);
    const desired = new THREE.Vector3(
      this.planetDistance * Math.cos(state.elevation) * Math.sin(state.azimuth),
      this.planetDistance * Math.sin(state.elevation),
      this.planetDistance * Math.cos(state.elevation) * Math.cos(state.azimuth),
    );
    if (desired.distanceTo(this.camera.position) > 0.03) {
      this.camera.position.copy(desired);
      this.controls.target.copy(target);
      this.controls.update();
    }
  }

  private emitCamera(): void {
    if (this.currentView !== 'planet') return;
    const offset = this.camera.position.clone().sub(this.controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    this.callbacks.onCameraChange({ azimuth: spherical.theta, elevation: Math.PI / 2 - spherical.phi });
  }

  private resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.fov = width < 700 ? 54 : 46;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    if (this.currentView === 'planet' && this.currentPlanet) {
      const nextDistance = generateWorld(this.currentPlanet).displayRadius * (width < 700 ? 4.8 : 3.85);
      if (!this.transition) {
        const offset = this.camera.position.clone().sub(this.controls.target).multiplyScalar(nextDistance / this.planetDistance);
        this.camera.position.copy(this.controls.target).add(offset);
      }
      this.planetDistance = nextDistance;
      const centerX = width < 700 ? 0 : 1.05;
      const globe = this.content.getObjectByName('portrait-globe');
      const atmosphere = this.content.getObjectByName('portrait-atmosphere');
      if (globe) globe.position.x = centerX;
      if (atmosphere) atmosphere.position.x = centerX;
    }
    if (this.currentView === 'earth') {
      const centerX = width < 700 ? 0 : 1.05;
      const globe = this.content.getObjectByName('earth-globe');
      const atmosphere = this.content.getObjectByName('earth-atmosphere');
      const iss = this.content.getObjectByName('iss-expedition');
      const moon = this.content.getObjectByName('moon-expedition');
      if (globe) globe.position.x = centerX;
      if (atmosphere) atmosphere.position.x = centerX;
      if (iss) iss.position.x = centerX;
      if (moon) moon.position.x = centerX;
      this.updateEarthDisplayScale();
    }
  }

  private animate(): void {
    if (document.hidden) return;
    const now = performance.now();
    if (this.transition) {
      const raw = Math.min(1, (now - this.transition.started) / 1700);
      const progress = raw < 0.5 ? 4 * raw ** 3 : 1 - ((-2 * raw + 2) ** 3) / 2;
      this.camera.position.lerpVectors(this.transition.from, this.transition.to, progress);
      this.camera.position.y += Math.sin(progress * Math.PI) * Math.min(2.2, this.transition.from.distanceTo(this.transition.to) * 0.05);
      this.controls.target.lerpVectors(this.transition.targetFrom, this.transition.targetTo, progress);
      if (raw >= 1) this.transition = null;
    }
    this.departing = this.departing.filter((departing) => {
      const opacity = 1 - Math.min(1, (now - departing.started) / 850);
      departing.group.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => { material.opacity = (material.userData.journeyOpacity ?? 1) * opacity; });
      });
      if (opacity > 0) return true;
      this.scene.remove(departing.group);
      disposeGroup(departing.group);
      return false;
    });
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.frameCount += 1;
    if (now - this.frameWindowStart >= 2000) {
      const fps = Math.round(this.frameCount * 1000 / (now - this.frameWindowStart));
      window.__OTHER_WORLDS__ = {
        ready: true,
        view: this.currentView,
        planet: this.currentPlanet?.pl_name ?? null,
        fps,
        drawCalls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        systems: this.catalogue.systems.size,
        planets: this.catalogue.planets.length,
        solarEpoch: this.currentSolarEpoch,
        issEpoch: this.currentIssEpoch,
        moonEpoch: this.currentMoonEpoch,
        gaiaYearOffset: this.currentGaiaYearOffset,
        camera: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z, targetX: this.controls.target.x, targetY: this.controls.target.y, targetZ: this.controls.target.z },
        transitioning: this.transition !== null,
      };
      this.frameCount = 0;
      this.frameWindowStart = now;
    }
    if (!this.ready) {
      this.ready = true;
      this.container.dataset.ready = 'true';
      window.__OTHER_WORLDS__ = {
        ready: true,
        view: this.currentView,
        planet: this.currentPlanet?.pl_name ?? null,
        fps: 0,
        drawCalls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        systems: this.catalogue.systems.size,
        planets: this.catalogue.planets.length,
        solarEpoch: this.currentSolarEpoch,
        issEpoch: this.currentIssEpoch,
        moonEpoch: this.currentMoonEpoch,
        gaiaYearOffset: this.currentGaiaYearOffset,
        camera: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z, targetX: this.controls.target.x, targetY: this.controls.target.y, targetZ: this.controls.target.z },
        transitioning: this.transition !== null,
      };
    }
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost);
    disposeGroup(this.content);
    this.departing.forEach((departing) => disposeGroup(departing.group));
    this.departing = [];
    this.spriteTexture.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

export default function Scene(props: SceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<WorldEngine | null>(null);
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    if (!containerRef.current) return;
    try {
      engineRef.current = new WorldEngine(containerRef.current, props.catalogue, {
        onSelect: (planet) => latest.current.onSelect(planet),
        onGaiaSelect: (star) => latest.current.onGaiaSelect(star),
        onCameraChange: (camera) => latest.current.onCameraChange(camera),
        onFailure: () => latest.current.onFailure(),
      }, props.reducedMotion, props.lowPower);
      engineRef.current.setView(props.view, props.planet, props.solarEpoch, props.issEpoch, props.moonEpoch, props.gaiaYearOffset);
      props.onReady();
    } catch (error) {
      console.warn('WebGL scene unavailable; using static reconstruction.', error);
      props.onFailure();
    }
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
    // The engine is created once; prop changes flow through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setView(props.view, props.planet, props.solarEpoch, props.issEpoch, props.moonEpoch, props.gaiaYearOffset);
    if (props.view === 'planet') engineRef.current?.setCamera(props.cameraState);
  }, [props.view, props.planet, props.catalogue]);

  useEffect(() => {
    engineRef.current?.setSolarEpoch(props.solarEpoch);
  }, [props.solarEpoch]);

  useEffect(() => {
    engineRef.current?.setIssEpoch(props.issEpoch);
  }, [props.issEpoch]);

  useEffect(() => {
    engineRef.current?.setMoonEpoch(props.moonEpoch);
  }, [props.moonEpoch]);

  useEffect(() => {
    engineRef.current?.setGaiaYearOffset(props.gaiaYearOffset);
  }, [props.gaiaYearOffset]);

  useEffect(() => {
    engineRef.current?.setCamera(props.cameraState);
  }, [props.cameraState]);

  return <div className="scene-canvas" ref={containerRef} data-testid="scene" />;
}
