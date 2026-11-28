/// <reference types="vite/client" />

interface Window {
  __OTHER_WORLDS__?: {
    ready: boolean;
    view: import('./types').ViewName;
    planet: string | null;
    fps: number;
    drawCalls: number;
    triangles: number;
    systems: number;
    planets: number;
    solarEpoch: string;
    issEpoch: string | null;
    moonEpoch: string | null;
    gaiaYearOffset: number;
    camera: { x: number; y: number; z: number; targetX: number; targetY: number; targetZ: number };
    transitioning: boolean;
  };
}
