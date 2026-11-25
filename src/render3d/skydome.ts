/**
 * The night sky as three objects in one group (ticket 081, section SK): a gradient dome, the stars as one points object, and the moon (a disc with a soft halo). Built from `NIGHT_SKY`
 * (`nightsky.ts`); `lightrig.ts` adds the group at night and removes it in day. The group follows the camera's position each frame (through its children's `onBeforeRender`), so it is
 * always round the viewer and inside the far plane. Nothing here writes depth: the dome draws first with no depth test, the stars and the moon are tested against the city.
 */

import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  PlaneGeometry,
  Points,
  PointsMaterial,
  ShaderMaterial,
  SphereGeometry,
  type Camera,
  type Object3D,
} from "three";
import { NIGHT_SKY, moonDirection, starField } from "./nightsky";

/** How far the dome, the stars and the moon stand from the camera (the camera's far plane is 2000). */
export const SKY_RADIUS = 900;

const DOME_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const DOME_FRAG = /* glsl */ `
uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uBelow; uniform float uBand;
varying vec3 vDir;
void main() {
  float el = degrees(asin(clamp(normalize(vDir).y, -1.0, 1.0)));
  vec3 above = mix(uHorizon, uZenith, 1.0 - exp(-max(el, 0.0) / uBand));
  gl_FragColor = vec4(mix(uBelow, above, smoothstep(-1.0, 1.0, el)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const MOON_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const MOON_FRAG = /* glsl */ `
uniform vec3 uDisc; uniform float uDiscR; uniform float uHalo;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float disc = 1.0 - smoothstep(uDiscR * 0.9, uDiscR, r);
  float halo = uHalo * pow(1.0 - smoothstep(uDiscR, 1.0, r), 2.0);
  gl_FragColor = vec4(uDisc, max(disc, halo));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Build the sky group. Its children are tagged by `userData.skyPart`: `dome`, `stars`, `moon`. */
export function buildSky(sky = NIGHT_SKY): Group {
  const group = new Group();
  group.name = "rig:sky";
  group.userData["lightRig"] = "sky";
  const follow = (o: Object3D): void => {
    o.frustumCulled = false;
    o.onBeforeRender = (_r, _s, camera: Camera): void => {
      group.position.copy(camera.position);
      group.updateMatrixWorld();
    };
  };

  const dome = new Mesh(
    new SphereGeometry(SKY_RADIUS, 32, 16),
    new ShaderMaterial({
      uniforms: {
        uZenith: { value: new Color(sky.sky.zenith) },
        uHorizon: { value: new Color(sky.sky.horizon) },
        uBelow: { value: new Color(sky.sky.below) },
        uBand: { value: sky.sky.band_deg },
      },
      vertexShader: DOME_VERT,
      fragmentShader: DOME_FRAG,
      side: BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
    }),
  );
  dome.userData["skyPart"] = "dome";
  dome.renderOrder = -1000;
  follow(dome);
  group.add(dome);

  const field = starField(sky.stars);
  const pos = new Float32Array(field.dirs.length);
  const col = new Float32Array(field.dirs.length);
  const tint = new Color(sky.stars.colour);
  for (let i = 0; i < field.brightness.length; i++) {
    for (let k = 0; k < 3; k++) pos[i * 3 + k] = field.dirs[i * 3 + k]! * SKY_RADIUS * 0.98;
    col[i * 3] = tint.r * field.brightness[i]!;
    col[i * 3 + 1] = tint.g * field.brightness[i]!;
    col[i * 3 + 2] = tint.b * field.brightness[i]!;
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("color", new BufferAttribute(col, 3));
  const stars = new Points(
    geo,
    new PointsMaterial({ size: sky.stars.size_px, sizeAttenuation: false, vertexColors: true, depthWrite: false, fog: false, toneMapped: false }),
  );
  stars.userData["skyPart"] = "stars";
  stars.renderOrder = -999;
  follow(stars);
  group.add(stars);

  const m = sky.moon;
  const D = SKY_RADIUS * 0.97;
  const tanHalo = Math.tan(((m.halo_deg / 2) * Math.PI) / 180);
  const moon = new Mesh(
    new PlaneGeometry(D * tanHalo * 2, D * tanHalo * 2),
    new ShaderMaterial({
      uniforms: {
        uDisc: { value: new Color(m.disc) },
        uDiscR: { value: Math.tan(((m.disc_deg / 2) * Math.PI) / 180) / tanHalo },
        uHalo: { value: m.halo },
      },
      vertexShader: MOON_VERT,
      fragmentShader: MOON_FRAG,
      transparent: true,
      depthWrite: false,
      fog: false,
    }),
  );
  const dir = moonDirection(0, m);
  moon.position.set(dir[0] * D, dir[1] * D, dir[2] * D);
  moon.lookAt(0, 0, 0);
  moon.userData["skyPart"] = "moon";
  moon.renderOrder = -998;
  follow(moon);
  group.add(moon);
  return group;
}

/** Free a sky group's geometry and materials. */
export function disposeSky(group: Group): void {
  group.traverse((o) => {
    const m = o as Mesh;
    if (m.geometry) m.geometry.dispose();
    if (m.material) (m.material as { dispose(): void }).dispose();
  });
}
