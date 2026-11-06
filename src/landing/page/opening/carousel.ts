// The carousel rig. The store's twenty pieces on one great ring floating over a glossy white floor, the headline
// hanging at its centre: the back of the ring passes behind the words, the front sweeps below them. The cursor
// tilts the ring and leans the camera; a sweep of the mouse pushes the spin; a drag throws it. On load the pieces
// drop into the turning ring one after another from above the frame, each landing with a small bounce that its
// reflection and shadow come up to meet, while the camera settles in.
// Scroll: the camera dives over the front pieces and through the words; inside, the ring closes in and whips
// round you; then it unrolls ahead into the SmartShop grid and the camera flies out the back of the ring to it.
import type { Cam, Frame, Pose, Rig, Tilt } from './rig';
import { PRODUCTS } from './looks';
import { TAU, clamp, easeInOut, expoOut, lerp, seg, smooth, wrap } from './math';
import { blendPose, gridPose, pose, type GridSpec } from './grid';

const N = PRODUCTS.length;

export function carousel(narrow: boolean): Rig {
  const R = narrow ? 4.6 : 7.0;
  const S = narrow ? 1.7 : 2.15;
  const H0 = S * 0.42 + 0.3; // the ring's centre height over the floor (y = 0)
  const grid: GridSpec = narrow
    ? { cols: 4, cell: 0.9, s: 0.86, cx: 0, cy: 3.0, cz: -15 }
    : { cols: 5, cell: 1.22, s: 1.16, cx: 0, cy: 2.9, cz: -15 };
  const gridBack = narrow ? 10.2 : 10;
  const rest = narrow
    ? { y: H0 + 2.6, z: 15.5, fov: 46, ly: H0 + 0.1 }
    : { y: H0 + 3.0, z: 15.5, fov: 34, ly: H0 - 0.6 };
  const ring = pose(), cell = pose();
  const fly = (f: Frame) => easeInOut(seg(f.p, 0, 0.5));
  const land = (f: Frame) => seg(f.p, 0.46, 1);
  /** Inside the ring: it closes in round the camera, peaking mid-dive. */
  const swirl = (f: Frame) => smooth(seg(f.p, 0.18, 0.4)) * (1 - smooth(seg(f.p, 0.5, 0.66)));

  return {
    looks: PRODUCTS,
    cruise: 0.15,
    aperture: 0.14,
    fog: [13, 34],
    floor: 0,
    pointerSpin: 1.6,
    restSpin: 0.08,
    introSpin: t => -TAU * 0.22 * (1 - expoOut(Math.min(1, t / 2.6))),
    spinScale: f => (1 + 3.2 * swirl(f)) * (1 - smooth(seg(f.p, 0.52, 0.7))),
    headFade: [6.5, 11],
    anchor: () => [0, H0 + 0.1, 0],
    tilt(f: Frame, g: Tilt) {
      const k = 1 - fly(f);
      g.rx = f.py * 0.085 * k;
      g.ry = 0;
      g.rz = -f.px * 0.065 * k;
    },
    camera(f: Frame, c: Cam) {
      // Intro: a slow settle in from a little further out and to the left as the pieces land.
      const q = easeInOut(seg(f.t, 0, 2.6));
      let x = lerp(-2.2, 0, q) + f.px * 0.9;
      let y = lerp(rest.y + 0.9, rest.y, q) - f.py * 0.45;
      let z = lerp(rest.z + 3.2, rest.z, q);
      let ly = lerp(rest.ly + 0.3, rest.ly, q), lz = 0;
      let fov = rest.fov;
      // The dive: over the front pieces and through the words into the ring, the lens widening, a slight bank.
      const a = fly(f);
      x = lerp(x, 0, a);
      y = lerp(y, H0 + 0.15, a);
      z = lerp(z, 0.6, a);
      ly = lerp(ly, H0 + 0.2, a);
      lz = lerp(lz, -10, a);
      fov = lerp(fov, narrow ? 74 : 62, a);
      // Out the back: rise to the grid's eye line, pull the lens in, and push on through the ring to the store.
      const b = easeInOut(land(f));
      y = lerp(y, grid.cy + 0.3, b);
      z = lerp(z, grid.cz + gridBack, b);
      ly = lerp(ly, grid.cy + 0.3, b);
      lz = lerp(lz, grid.cz, b);
      fov = lerp(fov, narrow ? 46 : 34, b);
      c.x = x; c.y = y; c.z = z; c.lx = 0; c.ly = ly; c.lz = lz; c.fov = fov;
      c.roll = Math.sin(Math.PI * seg(f.p, 0.05, 0.62)) * 0.1;
    },
    focus(f: Frame, c: Cam) {
      const a = fly(f), b = easeInOut(land(f));
      const r = R * (1 - 0.45 * swirl(f));
      const frontD = Math.hypot(c.x, c.y - H0, c.z - r);
      const backD = Math.hypot(c.x, c.y - H0, c.z + r);
      const gridD = Math.hypot(c.x, c.y - grid.cy, c.z - grid.cz);
      return lerp(lerp(frontD, backD, a), gridD, b);
    },
    place(i: number, f: Frame, o: Pose) {
      const th = f.spin + (i * TAU) / N;
      const lift = f.lift[i];
      const sw = swirl(f);
      const r = R * (1 - 0.45 * sw) + lift * 0.6;
      ring.x = r * Math.sin(th);
      ring.z = r * Math.cos(th);
      ring.y = H0 + Math.sin(f.t * 1.1 + i * 0.7) * 0.05 + lift * 0.12 + sw * Math.sin(th * 2 + f.t) * 0.35;
      ring.ry = th - 0.3 * Math.sin(th);
      ring.ry = lerp(ring.ry, wrap(ring.ry) * 0.45, lift);
      ring.rx = 0; ring.rz = sw * 0.18 * Math.cos(th);
      ring.s = S * (1 + lift * 0.1);
      ring.a = 1;
      // The drop: front pieces first, then round both ways to the back, each falling in with a small bounce.
      if (f.t < 3) {
        const ord = Math.abs(wrap(th)) / Math.PI;
        const t0 = 0.05 + ord * 1.1 + (i % 2) * 0.05;
        const q = clamp((f.t - t0) / 0.75);
        const fall = q >= 1 ? 0 : 1 - (1 + 1.7 * Math.pow(q - 1, 3) + 0.7 * Math.pow(q - 1, 2));
        ring.y += fall * 7.5;
        ring.a = clamp((f.t - t0) / 0.18);
      }
      const b = land(f);
      if (b <= 0) { Object.assign(o, ring); return; }
      // Unroll: each piece leaves the ring in store order and flips to face you in its grid cell.
      gridPose(i, grid, cell);
      ring.ry = wrap(ring.ry);
      const d = (i / N) * 0.4;
      blendPose(ring, cell, easeInOut(seg(b, d, d + 0.56)), 1.8, o);
    },
  };
}
