// The opening's shaders. A garment is a cut-out on a square plane. Its depth of field is per plane (a plane sits at one
// depth, so one blur radius is exact for it): a golden-angle disc of taps at a matching mip level, stretched along
// the plane's own screen motion for motion blur. Textures arrive premultiplied, so the blur never bleeds the
// transparent pixels' stray colour into the edges. Light is a soft key from the front left plus a narrow sheen;
// a plane seen from behind is its mirror image, a shade darker, the way the back of a hanging coat reads.
// Far planes wash into the page (atmospheric depth), and the cut-outs' faint alpha haze is dropped. A worn shot
// is cropped at the photo's edges, so its top and bottom edges fade out.

export const ITEM_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vW;
varying float vDepth;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
  vec4 mv = viewMatrix * w;
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

export const ITEM_FRAG = /* glsl */ `
uniform sampler2D map;
uniform float uBlur;
uniform float uLod;
uniform vec2 uSmear;
uniform float uAlpha;
uniform float uFadeB;
uniform float uRefl;
uniform float uFogNear;
uniform float uFogFar;
uniform float uSheen;
uniform vec3 uLight;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vW;
varying float vDepth;
const float GA = 2.39996323;
void main() {
  vec4 c;
  if (uBlur + abs(uSmear.x) + abs(uSmear.y) < 0.0015) {
    c = texture2D(map, vUv);
  } else {
    c = vec4(0.0);
    for (int i = 0; i < 14; i++) {
      float fi = float(i) + 0.5;
      float r = sqrt(fi / 14.0) * uBlur;
      float th = fi * GA;
      vec2 o = vec2(cos(th), sin(th)) * r + uSmear * (fi / 14.0 - 0.5);
      c += textureLod(map, vUv + o, uLod);
    }
    c /= 14.0;
  }
  float a = c.a;
  float a2 = clamp((a - 0.035) / 0.965, 0.0, 1.0);
  c.rgb *= a2 / max(a, 0.0001);
  c.a = a2;
  if (uFadeB > 0.0) c *= smoothstep(0.0, uFadeB, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vW);
  float facing = dot(n, v);
  if (facing < 0.0) n = -n;
  float lam = 0.84 + 0.16 * max(dot(n, uLight), 0.0);
  float shade = facing < 0.0 ? 0.8 : 1.0;
  vec3 h = normalize(uLight + v);
  float spec = pow(max(dot(n, h), 0.0), 70.0) * uSheen;
  c.rgb = c.rgb * lam * shade + vec3(spec) * c.a;
  if (uRefl > 0.5) c *= 1.0 - smoothstep(0.05, 0.45, vUv.y);
  float fog = smoothstep(uFogNear, uFogFar, vDepth);
  c.rgb = mix(c.rgb, vec3(0.968) * c.a, fog * 0.72);
  c *= (1.0 - fog * 0.42) * uAlpha;
  gl_FragColor = c;
}`;

export const SHADOW_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/** A soft contact shadow on the floor: a gaussian ellipse, premultiplied. */
export const SHADOW_FRAG = /* glsl */ `
uniform float uAlpha;
varying vec2 vUv;
void main() {
  vec2 q = (vUv - 0.5) * 2.0;
  float a = exp(-dot(q, q) * 3.4) * uAlpha;
  gl_FragColor = vec4(vec3(0.09, 0.09, 0.11) * a, a);
}`;
