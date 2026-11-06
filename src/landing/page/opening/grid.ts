// Where the carousel lands: the SmartShop grid (PAGE1 in the store's order, five across on a desktop, four on a
// phone), standing in the scene facing the camera. The flight ends here, so the opening hands over to
// the store it just showed.
import type { Pose } from './rig';
import { lerp } from './math';

export interface GridSpec { cols: number; cell: number; s: number; cx: number; cy: number; cz: number }

export function gridPose(i: number, g: GridSpec, out: Pose) {
  const rows = Math.ceil(20 / g.cols);
  const col = i % g.cols, row = Math.floor(i / g.cols);
  out.x = g.cx + (col - (g.cols - 1) / 2) * g.cell;
  out.y = g.cy + ((rows - 1) / 2 - row) * g.cell * 1.04;
  out.z = g.cz;
  out.rx = 0; out.ry = 0; out.rz = 0;
  out.s = g.s;
  out.a = 1;
}

/** Blend `from` toward `to` by q, with the flight arcing toward the camera (+z) and up on the way. */
export function blendPose(from: Pose, to: Pose, q: number, arc: number, out: Pose) {
  const bump = Math.sin(Math.PI * q);
  out.x = lerp(from.x, to.x, q);
  out.y = lerp(from.y, to.y, q) + bump * arc * 0.35;
  out.z = lerp(from.z, to.z, q) + bump * arc;
  out.rx = lerp(from.rx, to.rx, q);
  out.ry = lerp(from.ry, to.ry, q);
  out.rz = lerp(from.rz, to.rz, q);
  out.s = lerp(from.s, to.s, q);
  out.a = lerp(from.a, to.a, q);
}

export const pose = (): Pose => ({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1, a: 1 });
