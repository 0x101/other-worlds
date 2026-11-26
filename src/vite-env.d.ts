/// <reference types="vite/client" />

interface Window {
  __OTHER_WORLDS__?: {
    ready: boolean;
    view: 'atlas' | 'system' | 'planet';
    planet: string | null;
    fps: number;
    drawCalls: number;
    triangles: number;
    systems: number;
    planets: number;
  };
}
