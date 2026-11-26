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
  };
}
