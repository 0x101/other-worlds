import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraViewState, Catalogue, PlanetRow, ViewName } from '../types';
import { displayOrbit, generateWorld, seededRandom } from '../lib/world';
import { hashString, skyPosition } from '../lib/catalogue';

interface SceneProps {
  catalogue: Catalogue;
  view: ViewName;
  planet: PlanetRow | null;
  cameraState: CameraViewState;
  reducedMotion: boolean;
  lowPower: boolean;
  onSelect: (planet: PlanetRow) => void;
  onCameraChange: (camera: CameraViewState) => void;
  onReady: () => void;
  onFailure: () => void;
}

interface EngineCallbacks {
  onSelect: (planet: PlanetRow) => void;
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
    float fine = fbm(p * uNoiseScale * 3.1 - offset);
    vec3 albedo;
    if (uSurface == 0) {
      float provinces = smoothstep(0.34, 0.72, broad);
      albedo = mix(uColorA, uColorB, provinces);
      albedo = mix(albedo, uColorC, smoothstep(0.69, 0.94, fine) * 0.72);
      float ridges = abs(noise3(p * 18.0 + offset) - 0.5);
      albedo *= 0.88 + ridges * 0.3;
    } else if (uSurface == 1 || uSurface == 3) {
      float turbulence = fbm(vec3(p.x * 2.0, p.y * 7.0, p.z * 2.0) + offset);
      float frequency = uSurface == 3 ? uBandCount * 0.42 : uBandCount;
      float bands = sin((p.y + (turbulence - 0.5) * 0.14) * frequency * 3.14159);
      albedo = mix(uColorA, uColorB, bands * 0.5 + 0.5);
      albedo = mix(albedo, uColorC, smoothstep(0.66, 0.96, fine) * (uSurface == 3 ? 0.18 : 0.52));
    } else {
      float clouds = smoothstep(0.28, 0.82, broad + fine * 0.2);
      albedo = mix(uColorA, uColorB, clouds);
      albedo = mix(albedo, uColorC, smoothstep(0.7, 1.0, fine) * 0.48);
    }
    vec3 normal = normalize(vWorldNormal);
    float diffuse = max(dot(normal, normalize(uLightDirection)), 0.0);
    float wrapped = max(dot(normal, normalize(uLightDirection)) * 0.72 + 0.28, 0.0);
    float light = 0.075 + mix(diffuse, wrapped, 0.24) * uIllumination;
    float rim = pow(1.0 - max(dot(normal, normalize(vViewDirection)), 0.0), 3.0);
    vec3 color = albedo * light * uLightColor + uColorB * rim * 0.075;
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
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.6);
    gl_FragColor = vec4(uColor, fresnel * uStrength);
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
  materials.forEach((material) => material.dispose());
  group.clear();
}

class WorldEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(46, 1, 0.1, 500);
  private controls: OrbitControls;
  private content = new THREE.Group();
  private currentView: ViewName = 'atlas';
  private currentPlanet: PlanetRow | null = null;
  private catalogue: Catalogue;
  private callbacks: EngineCallbacks;
  private reducedMotion: boolean;
  private lowPower: boolean;
  private spriteTexture = circleTexture();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private pointerStart = new THREE.Vector2();
  private resizeObserver: ResizeObserver;
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
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.renderer.domElement.tabIndex = -1;
    container.appendChild(this.renderer.domElement);
    this.scene.add(this.content);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !reducedMotion;
    this.controls.dampingFactor = 0.055;
    this.controls.enablePan = false;
    this.controls.minDistance = 4.5;
    this.controls.maxDistance = 80;
    this.controls.rotateSpeed = 0.45;
    this.controls.zoomSpeed = 0.65;
    this.controls.addEventListener('end', () => this.emitCamera());
    this.camera.position.set(0, 7, 44);
    this.controls.target.set(0, 0, 0);
    this.buildStarfield();
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
      this.raycaster.params.Points.threshold = this.currentView === 'atlas' ? 0.55 : 0.2;
      const intersections = this.raycaster.intersectObjects(this.content.children, true);
      for (const intersection of intersections) {
        if (intersection.object instanceof THREE.Points && intersection.index !== undefined && this.currentView === 'atlas') {
          const names = intersection.object.userData.systems as string[];
          const host = names[intersection.index];
          const planet = host ? this.catalogue.systems.get(host)?.[0] : undefined;
          if (planet) { this.callbacks.onSelect(planet); return; }
        }
        const name = intersection.object.userData.planetName as string | undefined;
        if (name) {
          const planet = this.catalogue.byName.get(name);
          if (planet) { this.callbacks.onSelect(planet); return; }
        }
      }
    });
  }

  private buildStarfield(): void {
    const random = seededRandom(48151623);
    const count = this.lowPower ? 650 : 1500;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const radius = 65 + random() * 110;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.cos(phi);
      positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x9ca9a3, size: 0.24, transparent: true, opacity: 0.52, depthWrite: false }));
    stars.name = 'persistent-starfield';
    this.scene.add(stars);
  }

  setView(view: ViewName, planet: PlanetRow | null): void {
    this.currentView = view;
    this.currentPlanet = planet;
    disposeGroup(this.content);
    this.controls.autoRotate = view === 'atlas' && !this.reducedMotion;
    this.controls.autoRotateSpeed = 0.16;
    this.controls.enableZoom = true;
    this.controls.minDistance = view === 'planet' ? 4.8 : view === 'system' ? 12 : 20;
    this.controls.maxDistance = view === 'planet' ? 14 : view === 'system' ? 58 : 80;
    let destination = new THREE.Vector3(0, 7, 44);
    let target = new THREE.Vector3(0, 0, 0);
    if (view === 'atlas') this.buildAtlas();
    else if (view === 'system' && planet) {
      this.buildSystem(planet);
      destination = new THREE.Vector3(0, 18, 33);
    } else if (view === 'planet' && planet) {
      this.buildPlanet(planet);
      destination = new THREE.Vector3(0, 0.6, 7.4);
      target = new THREE.Vector3(0.5, 0, 0);
      this.controls.enableZoom = false;
    }
    if (this.reducedMotion || !this.ready) {
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
    const names: string[] = [];
    systems.forEach((siblings, index) => {
      const representative = siblings[0];
      const point = skyPosition(representative);
      positions.set([point.x, point.y, point.z], index * 3);
      const world = generateWorld(representative);
      const color = new THREE.Color(world.starColor).lerp(new THREE.Color(0xaebbb1), 0.42);
      colors.set([color.r, color.g, color.b], index * 3);
      names.push(representative.hostname);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: 0.52, map: this.spriteTexture, vertexColors: true, transparent: true, opacity: 0.92, alphaTest: 0.02, depthWrite: false, blending: THREE.AdditiveBlending });
    const points = new THREE.Points(geometry, material);
    points.userData.systems = names;
    this.content.add(points);
    for (const radius of [15, 24, 33]) {
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2);
      const line = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(160).map((point) => new THREE.Vector3(point.x, 0, point.y))),
        new THREE.LineBasicMaterial({ color: 0x668078, transparent: true, opacity: 0.065 }),
      );
      line.rotation.x = 0.28;
      this.content.add(line);
    }
    const home = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.spriteTexture, color: 0xe5c49a, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    home.scale.setScalar(1.25);
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
    const geometry = new THREE.SphereGeometry(world.displayRadius, this.lowPower ? 56 : 112, this.lowPower ? 36 : 80);
    const surfaceValue = { terrain: 0, bands: 1, clouds: 2, 'ice-bands': 3 }[world.surface];
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uColorA: { value: new THREE.Color(world.palette[0]) },
        uColorB: { value: new THREE.Color(world.palette[1]) },
        uColorC: { value: new THREE.Color(world.palette[2]) },
        uLightColor: { value: new THREE.Color(world.starColor) },
        uLightDirection: { value: new THREE.Vector3(-0.7, 0.38, 0.85).normalize() },
        uIllumination: { value: world.illumination },
        uNoiseScale: { value: world.noiseScale },
        uBandCount: { value: world.bandCount },
        uSeed: { value: world.seed % 100000 },
        uSurface: { value: surfaceValue },
      },
    });
    const globe = new THREE.Mesh(geometry, material);
    globe.position.x = 0.5;
    globe.rotation.z = world.axialTilt;
    globe.rotation.y = (world.seed % 628) / 100;
    this.content.add(globe);
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(world.displayRadius * 1.035, this.lowPower ? 48 : 80, this.lowPower ? 32 : 56),
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        uniforms: { uColor: { value: new THREE.Color(world.atmosphereColor) }, uStrength: { value: world.atmosphereStrength } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
      }),
    );
    atmosphere.position.copy(globe.position);
    this.content.add(atmosphere);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.spriteTexture, color: world.starColor, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.set(-6, 3.4, -3);
    glow.scale.setScalar(8);
    this.content.add(glow);
  }

  setCamera(state: CameraViewState): void {
    if (this.currentView !== 'planet' || this.transition) return;
    const radius = 7.4;
    const target = new THREE.Vector3(0.5, 0, 0);
    const desired = new THREE.Vector3(
      target.x + radius * Math.cos(state.elevation) * Math.sin(state.azimuth),
      radius * Math.sin(state.elevation),
      radius * Math.cos(state.elevation) * Math.cos(state.azimuth),
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
  }

  private animate(): void {
    if (document.hidden) return;
    const now = performance.now();
    if (this.transition) {
      const raw = Math.min(1, (now - this.transition.started) / 1700);
      const progress = raw < 0.5 ? 4 * raw ** 3 : 1 - ((-2 * raw + 2) ** 3) / 2;
      this.camera.position.lerpVectors(this.transition.from, this.transition.to, progress);
      this.controls.target.lerpVectors(this.transition.targetFrom, this.transition.targetTo, progress);
      if (raw >= 1) this.transition = null;
    }
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
      };
      this.frameCount = 0;
      this.frameWindowStart = now;
    }
    if (!this.ready) {
      this.ready = true;
      this.container.dataset.ready = 'true';
      window.__OTHER_WORLDS__ = { ready: true, view: this.currentView, planet: this.currentPlanet?.pl_name ?? null, fps: 0, drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, systems: this.catalogue.systems.size, planets: this.catalogue.planets.length };
    }
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost);
    disposeGroup(this.content);
    const starfield = this.scene.getObjectByName('persistent-starfield') as THREE.Points | undefined;
    starfield?.geometry.dispose();
    if (starfield?.material instanceof THREE.Material) starfield.material.dispose();
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
        onCameraChange: (camera) => latest.current.onCameraChange(camera),
        onFailure: () => latest.current.onFailure(),
      }, props.reducedMotion, props.lowPower);
      engineRef.current.setView(props.view, props.planet);
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
    engineRef.current?.setView(props.view, props.planet);
    if (props.view === 'planet') engineRef.current?.setCamera(props.cameraState);
  }, [props.view, props.planet, props.catalogue]);

  useEffect(() => {
    engineRef.current?.setCamera(props.cameraState);
  }, [props.cameraState]);

  return <div className="scene-canvas" ref={containerRef} data-testid="scene" />;
}
