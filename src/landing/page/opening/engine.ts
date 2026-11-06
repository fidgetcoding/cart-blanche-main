// The opening's engine. One WebGL renderer draws the garments as lit planes in a real 3D scene; the carousel rig
// poses the camera and every garment each frame from the clock, the scroll, the spin and the cursor.
// The headline is real DOM text floating at the scene's centre: each frame the planes behind it are drawn first and
// copied onto a 2D canvas under the headline, then the planes in front of it are drawn on the WebGL canvas above
// it, so the collection passes behind and in front of the words. Depth of field and motion blur are per plane
// (shaders.ts); the glossy floor adds mirrored reflections and soft contact shadows.
// Textures decode off the main thread (createImageBitmap) and upload two a frame; the loop runs only while the
// opening is on screen and the tab is visible. A still frame (reduced motion) renders once.
import { loadThree, type Any } from './three';
import { ITEM_FRAG, ITEM_VERT, SHADOW_FRAG, SHADOW_VERT } from './shaders';
import type { Look } from './looks';
import type { Cam, Frame, Pose, Rig, Tilt } from './rig';
import { clamp, damp, seg } from './math';

export interface Dom {
  sec: HTMLElement;
  frame: HTMLElement;
  back: HTMLCanvasElement;
  front: HTMLCanvasElement;
  head: HTMLElement;
  label: HTMLElement;
}

export interface Opts {
  rig: Rig; still: boolean; narrow: boolean; runPx: () => number; texSize: number;
  /** The show has started (the garments are in): the opening's self-scroll waits for this. */
  onShow?: () => void;
}

interface Item {
  look: Look;
  mesh: Any;
  mat: Any;
  refl: Any;
  shadow: Any;
  loaded: boolean;
  ready: number;
  mask: Uint8ClampedArray | null;
  pose: Pose;
  front: boolean;
  vis: boolean;
  px: number;
  py: number;
}

const MASK = 32;
const SHUTTER = 1 / 100;

export async function createEngine(dom: Dom, o: Opts): Promise<{ dispose(): void }> {
  const THREE = await loadThree();
  const { rig } = o;
  let dead = false;

  const renderer = new THREE.WebGLRenderer({ canvas: dom.front, alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  const ctx = dom.back.getContext('2d') as CanvasRenderingContext2D;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 400);
  const group = new THREE.Group();
  scene.add(group);
  const geo = new THREE.PlaneGeometry(1, 1);
  const light = new THREE.Vector3(-0.45, 0.55, 0.7).normalize();
  const F = rig.floor;
  const mirror = new THREE.Matrix4().set(1, 0, 0, 0, 0, -1, 0, 2 * F, 0, 0, 1, 0, 0, 0, 0, 1);

  const itemMat = (refl: boolean) => new THREE.ShaderMaterial({
    vertexShader: ITEM_VERT, fragmentShader: ITEM_FRAG,
    uniforms: {
      map: { value: null }, uBlur: { value: 0 }, uLod: { value: 0 }, uSmear: { value: new THREE.Vector2() },
      uAlpha: { value: 0 }, uFadeB: { value: 0 }, uRefl: { value: refl ? 1 : 0 }, uFogNear: { value: rig.fog[0] },
      uFogFar: { value: rig.fog[1] }, uSheen: { value: 0.16 }, uLight: { value: light },
    },
    transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
  });

  const items: Item[] = rig.looks.map(look => {
    const mat = itemMat(false);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.order = 'YXZ';
    mesh.renderOrder = 2;
    mesh.visible = false;
    group.add(mesh);
    const refl = new THREE.Mesh(geo, itemMat(true));
    refl.matrixAutoUpdate = false;
    refl.renderOrder = 1;
    refl.visible = false;
    scene.add(refl);
    const shadow = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      vertexShader: SHADOW_VERT, fragmentShader: SHADOW_FRAG, uniforms: { uAlpha: { value: 0 } },
      transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false,
    }));
    shadow.rotation.order = 'YXZ';
    shadow.renderOrder = 0;
    shadow.visible = false;
    scene.add(shadow);
    return { look, mesh, mat, refl, shadow, loaded: false, ready: 0, mask: null, pose: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1, a: 0 }, front: false, vis: false, px: NaN, py: NaN };
  });

  // ---- Textures: fetched and decoded off the main thread, premultiplied, flipped for GL; uploaded a few a frame.
  // One texture per image, shared by every piece that shows it.
  const S = o.texSize;
  const bySrc = new Map<string, Item[]>();
  for (const it of items) bySrc.set(it.look.src, [...(bySrc.get(it.look.src) ?? []), it]);
  const pending: { group: Item[]; bmp: ImageBitmap }[] = [];
  const textures: Any[] = [];
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = maskCanvas.height = MASK;
  const mctx = maskCanvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  const loads = [...bySrc].map(([src, group]) => fetch(src)
    .then(r => r.blob())
    .then(b => createImageBitmap(b, { premultiplyAlpha: 'premultiply', imageOrientation: 'flipY', resizeWidth: S, resizeHeight: S, resizeQuality: 'high' }))
    .then(bmp => {
      if (dead) { bmp.close(); return; }
      mctx.clearRect(0, 0, MASK, MASK);
      mctx.drawImage(bmp, 0, 0, MASK, MASK);
      const d = mctx.getImageData(0, 0, MASK, MASK).data;
      const m = new Uint8ClampedArray(MASK * MASK);
      for (let k = 0; k < m.length; k++) m[k] = d[k * 4 + 3];
      for (const it of group) it.mask = m;
      pending.push({ group, bmp });
    })
    .catch(() => { /* a missing piece just stays out of the orbit */ }));
  const upload = (n: number) => {
    for (let k = 0; k < n && pending.length; k++) {
      const { group, bmp } = pending.shift()!;
      const tex = new THREE.Texture(bmp);
      tex.flipY = false;
      tex.premultiplyAlpha = false;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      tex.needsUpdate = true;
      renderer.initTexture(tex);
      textures.push(tex);
      for (const it of group) {
        it.mat.uniforms.map.value = tex;
        it.refl.material.uniforms.map.value = tex;
        it.loaded = true;
      }
    }
  };

  // ---- State.
  const f: Frame = { t: 0, p: 0, spin: rig.restSpin, px: 0, py: 0, lift: new Float32Array(items.length), aspect: 1, narrow: o.narrow, still: o.still };
  const cam: Cam = { x: 0, y: 0, z: 10, lx: 0, ly: 0, lz: 0, fov: 30, roll: 0 };
  const g: Tilt = { rx: 0, ry: 0, rz: 0 };
  let spin = rig.restSpin, vel = rig.cruise;
  let rawX = 0, rawY = 0, mouseX = -1, mouseY = -1, mouseIn = false, lastNx: number | null = null;
  let dragging = false, dragId = -1, dragX = 0, dragT = 0, dragVx = 0;
  let hover = -1, started = false, W = 1, H = 1, secTop = 0, runPx = o.runPx();
  const ref = { x: 0, y: 0, d: 1 };
  const v3 = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const wp = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  const toCam = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  const applyCam = () => {
    camera.position.set(cam.x, cam.y, cam.z);
    camera.up.set(Math.sin(cam.roll), Math.cos(cam.roll), 0);
    camera.lookAt(cam.lx, cam.ly, cam.lz);
    if (camera.fov !== cam.fov || camera.aspect !== f.aspect) { camera.fov = cam.fov; camera.aspect = f.aspect; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();
  };
  /** Screen offset from the frame's centre (px) and camera distance of a world point. */
  const project = (x: number, y: number, z: number) => {
    v3.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
    const d = -v3.z;
    v3.applyMatrix4(camera.projectionMatrix);
    return { x: (v3.x * W) / 2, y: (-v3.y * H) / 2, d };
  };
  /** Where the headline anchor sits at rest (settled, unscrolled, cursor centred): the headline's CSS place. */
  const measureRef = () => {
    const keep = { ...f };
    Object.assign(f, { t: 99, p: 0, px: 0, py: 0 });
    rig.camera(f, cam);
    applyCam();
    const a = rig.anchor(f);
    const r = project(a[0], a[1], a[2]);
    ref.x = r.x; ref.y = r.y; ref.d = r.d;
    Object.assign(f, keep);
  };
  const measure = () => {
    W = Math.max(1, dom.frame.clientWidth);
    H = Math.max(1, dom.frame.clientHeight);
    f.aspect = W / H;
    renderer.setSize(W, H, false);
    dom.back.width = Math.round(W * dpr);
    dom.back.height = Math.round(H * dpr);
    const r = dom.sec.getBoundingClientRect();
    secTop = r.top + window.scrollY;
    runPx = o.runPx();
    measureRef();
  };

  // ---- Pointer: the cursor tilts and nudges, a drag (or a swipe on a phone) spins with a throw on release.
  const local = (e: PointerEvent) => {
    const r = dom.frame.getBoundingClientRect();
    return { nx: ((e.clientX - r.left) / r.width) * 2 - 1, ny: ((e.clientY - r.top) / r.height) * 2 - 1 };
  };
  const onMove = (e: PointerEvent) => {
    const { nx, ny } = local(e);
    if (e.pointerType === 'mouse') {
      if (lastNx !== null && !dragging) vel += (nx - lastNx) * rig.pointerSpin;
      lastNx = nx;
      rawX = nx; rawY = ny; mouseX = e.clientX; mouseY = e.clientY; mouseIn = true;
    }
    if (dragging && e.pointerId === dragId) {
      const now = performance.now();
      const dx = (e.clientX - dragX) / W;
      const k = Math.max(1, now - dragT) / 1000;
      spin += dx * 2.6;
      dragVx = damp(dragVx, (dx * 2.6) / k, 18, k);
      dragX = e.clientX; dragT = now;
    }
  };
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    dragging = true; dragId = e.pointerId; dragX = e.clientX; dragT = performance.now();
    dragVx = 0;
    if (e.pointerType === 'mouse') dom.frame.setPointerCapture(e.pointerId);
  };
  const onUp = (e: PointerEvent) => {
    if (!dragging || e.pointerId !== dragId) return;
    dragging = false;
    vel = performance.now() - dragT < 90 ? clamp(dragVx, -9, 9) : rig.cruise * 0.3;
    if (dom.frame.hasPointerCapture(e.pointerId)) dom.frame.releasePointerCapture(e.pointerId);
  };
  const onLeave = (e: PointerEvent) => { if (e.pointerType === 'mouse') { mouseIn = false; lastNx = null; rawX = 0; rawY = 0; } };
  if (!o.still) {
    dom.frame.addEventListener('pointermove', onMove);
    dom.frame.addEventListener('pointerdown', onDown);
    dom.frame.addEventListener('pointerup', onUp);
    dom.frame.addEventListener('pointercancel', onUp);
    dom.frame.addEventListener('pointerleave', onLeave);
  }

  // ---- One frame of the scene.
  const update = (dt: number) => {
    const p0 = clamp((window.scrollY - secTop) / Math.max(1, runPx));
    if (o.still) { f.t = 99; f.p = p0; f.spin = rig.restSpin; }
    else {
      if (started) f.t += dt;
      f.p = Math.abs(p0 - f.p) < 0.0004 ? p0 : damp(f.p, p0, 6.5, dt);
      f.px = damp(f.px, rawX, 3.2, dt);
      f.py = damp(f.py, rawY, 3.2, dt);
      const scale = rig.spinScale(f);
      if (!dragging) {
        vel = damp(vel, rig.cruise * scale, 1.15, dt);
        spin += vel * dt * (0.35 + 0.65 * scale);
      }
      f.spin = spin + rig.introSpin(f.t);
      for (let i = 0; i < items.length; i++) f.lift[i] = damp(f.lift[i], i === hover ? 1 : 0, 9, dt);
    }
    rig.camera(f, cam);
    applyCam();
    rig.tilt(f, g);
    group.rotation.set(g.rx, g.ry, g.rz, 'YXZ');
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      it.ready = o.still ? (it.loaded ? 1 : 0) : damp(it.ready, it.loaded ? 1 : 0, 5, dt);
      rig.place(i, f, it.pose);
      const P = it.pose;
      it.mesh.position.set(P.x, P.y, P.z);
      it.mesh.rotation.set(P.rx, P.ry, P.rz);
      it.mesh.scale.setScalar(P.s);
    }
    group.updateMatrixWorld(true);
    const A = rig.anchor(f);
    const dA = project(A[0], A[1], A[2]).d;
    const df = rig.focus(f, cam);
    const tanHalf = Math.tan((cam.fov * Math.PI) / 360);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const P = it.pose;
      const alpha = P.a * it.ready;
      it.vis = it.loaded && alpha > 0.004;
      if (!it.vis) { it.px = NaN; continue; }
      wp.setFromMatrixPosition(it.mesh.matrixWorld);
      const sp = project(wp.x, wp.y, wp.z);
      const d = sp.d;
      if (d < 0.05) { it.vis = false; it.px = NaN; continue; }
      it.front = d < dA;
      const s = P.s;
      // The piece under the cursor is pulled into focus as it lifts.
      const blur = clamp((rig.aperture * Math.abs(1 - d / df)) / s, 0, 0.16) * (1 - f.lift[i]);
      const u = it.mat.uniforms;
      u.uBlur.value = blur;
      u.uLod.value = Math.log2(Math.max(1, blur * S * 0.47));
      // Motion blur: the plane's screen motion over a short shutter, in its own uv. A plane turning edge-on fades,
      // so it never draws as a hairline.
      const nX = (sp.x / W) * 2, nY = (sp.y / H) * 2;
      nrm.set(0, 0, 1).transformDirection(it.mesh.matrixWorld);
      toCam.set(cam.x, cam.y, cam.z).sub(wp).normalize();
      const facing = nrm.dot(toCam);
      u.uAlpha.value = alpha * clamp((Math.abs(facing) - 0.04) / 0.26);
      let sx = 0, sy = 0;
      if (!o.still && !Number.isNaN(it.px) && dt > 0) {
        const span = s / (d * tanHalf);
        sx = (((nX - it.px) / dt) * SHUTTER * f.aspect) / span / Math.max(0.35, Math.abs(facing)) * (facing < 0 ? -1 : 1);
        sy = -(((nY - it.py) / dt) * SHUTTER) / span;
        const m = Math.hypot(sx, sy);
        if (m > 0.18) { sx *= 0.18 / m; sy *= 0.18 / m; }
      }
      it.px = nX; it.py = nY;
      u.uSmear.value.set(sx, sy);
      {
        it.refl.matrix.multiplyMatrices(mirror, it.mesh.matrixWorld);
        it.refl.matrixWorldNeedsUpdate = true;
        const ru = it.refl.material.uniforms;
        const rb = clamp(blur + 0.035 / s, 0, 0.16);
        ru.uAlpha.value = u.uAlpha.value * 0.3;
        ru.uBlur.value = rb;
        ru.uLod.value = Math.log2(Math.max(1, rb * S * 0.47));
        ru.uSmear.value.set(sx, -sy);
        const h = Math.max(0, wp.y - s * 0.42 - F);
        it.shadow.position.set(wp.x, F + 0.002, wp.z);
        it.shadow.rotation.set(-Math.PI / 2, P.ry + g.ry, 0);
        const spread = 1 + h * 0.45;
        it.shadow.scale.set(s * 0.8 * spread, s * 0.32 * spread, 1);
        it.shadow.material.uniforms.uAlpha.value = alpha * 0.34 * clamp(1 - h / 2.4) / spread;
      }
    }
    // The headline rides the camera: it moves and grows as if it hung at its anchor in the scene; as the camera
    // reaches it the lines part (top half up, bottom half down) to let it through, then it fades.
    const hp = project(A[0], A[1], A[2]);
    const fade = hp.d <= 0 ? 0 : seg(hp.d, rig.headFade[0], rig.headFade[1]);
    const k = hp.d > 0 ? ref.d / hp.d : 1;
    const part = hp.d <= 0 ? 1 : seg(k, 1.12, 2.1);
    dom.head.style.setProperty('--part', (part * part * (3 - 2 * part)).toFixed(4));
    // Once the lines have parted past the frame they stay gone, however close the camera ends up.
    const shown = fade * (1 - seg(part, 0.7, 1));
    dom.head.style.transform = `translate3d(${(hp.x - ref.x).toFixed(1)}px, ${(hp.y - ref.y).toFixed(1)}px, 0) scale(${k.toFixed(4)})`;
    dom.head.style.opacity = shown.toFixed(3);
    dom.head.style.visibility = shown < 0.005 ? 'hidden' : '';
    pick();
  };

  // ---- Hover: the garment under the cursor (by its cut-out, not its square) lifts and shows its name and price.
  let labelFor = -1;
  const pick = () => {
    let h = -1;
    if (!o.still && mouseIn && !dragging && f.p < 0.04) {
      const r = dom.frame.getBoundingClientRect();
      ndc.set(((mouseX - r.left) / r.width) * 2 - 1, -(((mouseY - r.top) / r.height) * 2 - 1));
      ray.setFromCamera(ndc, camera);
      const meshes = items.filter(it => it.vis && it.pose.a * it.ready > 0.5).map(it => it.mesh);
      const hits = ray.intersectObjects(meshes, false);
      for (const hit of hits) {
        const it = items.find(x => x.mesh === hit.object)!;
        const uv = hit.uv;
        if (!it.mask || !uv) continue;
        const mx = Math.min(MASK - 1, Math.floor(uv.x * MASK)), my = Math.min(MASK - 1, Math.floor(uv.y * MASK));
        if (it.mask[my * MASK + mx] > 60) { h = items.indexOf(it); break; }
      }
    }
    hover = h;
    dom.frame.style.cursor = h >= 0 ? 'pointer' : dragging ? 'grabbing' : '';
    const show = h >= 0 ? h : labelFor;
    if (h >= 0 && h !== labelFor) {
      labelFor = h;
      (dom.label.children[0] as HTMLElement).textContent = items[h].look.name;
      (dom.label.children[1] as HTMLElement).textContent = items[h].look.price;
    }
    if (show >= 0) {
      const it = items[show];
      tmp.setFromMatrixPosition(it.mesh.matrixWorld);
      const s = it.pose.s;
      const q = project(tmp.x, tmp.y - s * 0.46, tmp.z);
      dom.label.style.transform = `translate3d(${(W / 2 + q.x).toFixed(1)}px, ${(H / 2 + q.y + 6).toFixed(1)}px, 0) translateX(-50%)`;
    }
    dom.label.style.opacity = h >= 0 ? '1' : '0';
  };

  const render = () => {
    for (const it of items) {
      it.mesh.visible = it.vis && !it.front;
      it.refl.visible = it.vis;
      it.shadow.visible = it.vis;
    }
    renderer.render(scene, camera);
    ctx.clearRect(0, 0, dom.back.width, dom.back.height);
    ctx.drawImage(dom.front, 0, 0, dom.back.width, dom.back.height);
    for (const it of items) {
      it.mesh.visible = it.vis && it.front;
      it.refl.visible = false;
      it.shadow.visible = false;
    }
    renderer.render(scene, camera);
  };

  // ---- Lifecycle.
  measure();
  await renderer.compileAsync(scene, camera);
  if (dead) return { dispose() { /* already gone */ } };
  let raf = 0, last = 0, running = false, onScreen = true, idle = 0;
  const t0 = performance.now();
  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    upload(2);
    if (!started) {
      const n = items.filter(it => it.loaded).length;
      if (n >= items.length * 0.6 || now - t0 > 1400) { started = true; o.onShow?.(); }
    }
    // Landed on the store and holding there: nothing moves, so the canvases keep their last frame and the GPU
    // is left to the story coming up under the opening.
    const landed = window.scrollY - secTop >= runPx && f.p > 0.9995;
    idle = landed ? idle + 1 : 0;
    if (idle > 3) return;
    update(started ? dt : 0);
    render();
  };
  const run = () => {
    const want = onScreen && !document.hidden && !dead;
    if (want && !running) { running = true; last = 0; raf = requestAnimationFrame(tick); }
    if (!want && running) { running = false; cancelAnimationFrame(raf); }
  };
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (!o.still) run(); }, { rootMargin: '80px' });
  const ro = new ResizeObserver(() => { measure(); if (o.still) { update(0); render(); } });
  const onVis = () => run();

  const disposeAll = () => {
    dead = true;
    cancelAnimationFrame(raf);
    io.disconnect();
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    dom.frame.removeEventListener('pointermove', onMove);
    dom.frame.removeEventListener('pointerdown', onDown);
    dom.frame.removeEventListener('pointerup', onUp);
    dom.frame.removeEventListener('pointercancel', onUp);
    dom.frame.removeEventListener('pointerleave', onLeave);
    for (const tex of textures) tex.dispose();
    for (const it of items) {
      it.mat.dispose();
      it.refl.material.dispose();
      it.shadow.material.dispose();
    }
    geo.dispose();
    renderer.dispose();
    renderer.getContext().getExtension('WEBGL_lose_context')?.loseContext();
  };

  if (o.still) {
    await Promise.all(loads);
    if (dead) return { dispose() { /* already gone */ } };
    upload(bySrc.size);
    measure();
    update(0);
    render();
    ro.observe(dom.frame);
    return { dispose: disposeAll };
  }
  io.observe(dom.sec);
  ro.observe(dom.frame);
  document.addEventListener('visibilitychange', onVis);
  run();
  return { dispose: disposeAll };
}
