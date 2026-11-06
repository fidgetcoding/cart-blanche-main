// The rig contract: what the carousel supplies to pose the scene each frame (see engine.ts).
import type { Look } from './looks';

export interface Pose { x: number; y: number; z: number; rx: number; ry: number; rz: number; s: number; a: number }
export interface Cam { x: number; y: number; z: number; lx: number; ly: number; lz: number; fov: number; roll: number }
export interface Tilt { rx: number; ry: number; rz: number }
/** Everything a rig reads to pose the scene. */
export interface Frame {
  /** Seconds since the show started (99 in a still frame). */
  t: number;
  /** Scroll through the opening, 0..1, smoothed. */
  p: number;
  /** The ring's angle (inertia, drag, the opening whip). */
  spin: number;
  /** Cursor, -1..1, smoothed. */
  px: number;
  py: number;
  /** Per garment: how lifted by the cursor it is, 0..1. */
  lift: Float32Array;
  aspect: number;
  narrow: boolean;
  still: boolean;
}

export interface Rig {
  looks: Look[];
  /** Idle spin, radians a second. */
  cruise: number;
  /** Depth of field: the lens's aperture in world units. */
  aperture: number;
  /** Atmospheric wash: starts and ends at these camera distances. */
  fog: [number, number];
  /** World y of the glossy floor (reflections and contact shadows). */
  floor: number;
  /** Spin added on top while the show opens (the whip), by seconds since it started. */
  introSpin(t: number): number;
  /** 0..1 on the spin's speed (to bring the ring to rest as it turns into the store). */
  spinScale(f: Frame): number;
  /** How far a sweep of the mouse across the screen nudges the spin (radians a second per screen width). */
  pointerSpin: number;
  /** Spin for a still frame. */
  restSpin: number;
  camera(f: Frame, c: Cam): void;
  tilt(f: Frame, g: Tilt): void;
  place(i: number, f: Frame, o: Pose): void;
  focus(f: Frame, c: Cam): number;
  /** The headline's world anchor: its depth splits the planes into behind and in front. */
  anchor(f: Frame): [number, number, number];
  /** The headline fades out as the camera comes within these distances of it (its lines part before that). */
  headFade: [number, number];
}
