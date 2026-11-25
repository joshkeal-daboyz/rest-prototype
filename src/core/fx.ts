/**
 * The particle textures and meshes the city view uses (ticket 081 FX). Typed data only: no logic.
 *
 * Josh owns the particle pack (`assets/private/in/particle-fx-pack/`, git-ignored). Its effects are Unity prefabs, so the city view rebuilds them in Three.js
 * (`src/render3d/`, 081 FX2 and FX3); only these PNGs are taken from it. They reach the game through the game pack: `npm run assets:game` (082 B, `tools/assets/game.ts`;
 * 081 FX1) copies each into `assets/private/out/game/fx/` and lists it in the game manifest's `fx`. The renderer fetches them by URL at run time, as it fetches GLBs.
 * Nothing from the pack is committed, imported into the bundle, or copied into `public/` or `dist/` (Synty-style licence, Josh, 16 Nov 2026). With no game pack, or one
 * without `fx` (CI, a fresh clone), the renderer draws each effect with a texture made in code, so the page and the tests need no asset.
 */

/** The pack's folder under `assets/private/in/`. */
export const FX_SOURCE_PACK = "particle-fx-pack" as const;

/** Where the PNGs sit inside the pack folder, forward slashes, ending in "/". */
export const FX_SOURCE_DIR = "Source Files/Textures/" as const;

/** The folder under the game pack (`out/game/`) the textures are copied to, ending in "/". */
export const FX_GAME_DIR = "fx/" as const;

/**
 * The textures, by the id the renderer names them with, and each one's file name in `FX_SOURCE_DIR` (read 24 Nov 2026):
 * - `sparkle`: a four-point star, 512 x 512 (live-break sparks, repair and Relight bursts);
 * - `softSpot`: a soft round glow, 512 x 512 (the flash behind a spark or a repair);
 * - `lightning`: a vertical bolt strip, 172 x 1024 (brownout arcing);
 * - `smoke`: a small puff, 200 x 200 (a wisp off a live break).
 */
export const FX_TEXTURES = {
  sparkle: "PolygonParticles_Sparkle.png",
  softSpot: "PolygonParticles_Soft_Spot.png",
  lightning: "PolygonParticles_Lightning_02.png",
  smoke: "PolygonParticles_Smoke_01.png",
} as const;

export type FxTextureId = keyof typeof FX_TEXTURES;

/**
 * The pack's meshes the city view uses (Josh, 24 Nov 2026, on card FX-Q2: "Meshes too"), as `pack:name` keys (`CalibrationKey`), by the id the renderer names them with.
 * They are converted like any pack (`npm run assets:convert particle-fx-pack`, 081 FX1) and cut into the game pack beside the models; the renderer uses their geometry
 * only, under its own additive material (the pack's materials are Unity custom shaders). Root names are the FBX stems as read 24 Nov 2026; FX1's builder checks them
 * against the converted manifest, and a mismatch is a re-cut of this table, not a guess.
 * - `spark`: `FX_Spark_01.fbx`, a spark streak (live-break sparks, stretched along their flight);
 * - `shard`: `FX_Shard_Rock_Small_01.fbx`, a small chip (hot fragments thrown by a break burst and a repair). The architect's pick of the pack's five shard meshes;
 *   Josh may swap it from the gallery once the pack is converted (081 FX-Q5).
 * Optional at run time: a key the manifest lacks is drawn as FX2's sprites.
 */
export const FX_MESHES = {
  spark: "particle-fx-pack:FX_Spark_01",
  shard: "particle-fx-pack:FX_Shard_Rock_Small_01",
} as const;

export type FxMeshId = keyof typeof FX_MESHES;

/** One copied texture in the game manifest's `fx` (`AssetManifest.fx`). */
export interface AssetFxTexture {
  id: FxTextureId;
  /** The copied image, relative to the game manifest, forward slashes (e.g. "fx/PolygonParticles_Sparkle.png"). */
  image: string;
}
