// three.js, loaded as its own chunk so it never holds up the page's first paint. The engine types it loosely.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type Any = any;

let mod: Promise<Any> | null = null;
export const loadThree = (): Promise<Any> => {
  if (!mod) mod = import('three');
  return mod;
};

let gl: boolean | null = null;
/** Whether this browser can draw WebGL. Without it (an old device, a test runner) the opening shows a still frame. */
export function hasWebGL(): boolean {
  if (gl !== null) return gl;
  gl = false;
  try {
    if (typeof WebGL2RenderingContext === 'undefined' && typeof WebGLRenderingContext === 'undefined') return gl;
    const c = document.createElement('canvas');
    const ctx = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    gl = !!ctx;
    ctx?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    gl = false;
  }
  return gl;
}
