/**
 * The asset gallery (ticket 074): one dev-only page per converted pack, so Josh can see every piece, its exact name, its size and its flags before he tells an agent how to use it.
 * Types only, plus the use list and the page size (data, as `CITY_STAGES` is). No logic: the catalogue and the viewer are the renderer's (`src/render3d/assetcatalogue.ts`, `assetviewer.ts`;
 * sections A and B), the page is the ui's (`src/ui/assetgallery.ts`; section C).
 *
 * Licence (Josh, 16 Nov 2026): nothing from the packs is committed or saved. The gallery reads `assets/private/out/` at run time on Josh's machine, draws thumbnails in memory only, and is
 * never in a web build. Nothing here names a DOM type: the viewer's canvas is handed to its factory (`createAssetGallery(canvas)`, section B), not named here, so `src/core/` stays DOM-free.
 */

import type { AssetFailure, AssetWarning } from "./assets";
import type { CalibrationKey } from "./calibration";

/**
 * What can use a piece, in the order the page lists them. "ladder" is the puzzle maps' 3D town (`MODEL_TABLE`, the stack recipes, its dressing, furniture and power kit); the rest are the
 * city pipeline's stages that place pieces (`CITY_STAGES`' "edge" to "traffic") and the three era passes (`CITY_ERA_STAGES` less "history", which places none).
 */
export const ASSET_GALLERY_USES = ["ladder", "edge", "buildings", "circuit", "facades", "ground", "traffic", "tech", "holdout", "ruin"] as const;
export type AssetGalleryUse = (typeof ASSET_GALLERY_USES)[number];

/** One use of a piece. `placed` is false when the table types the piece but its stage never places it (the tech kit's `placed: false`, for example `Prop_Pipes_01`). */
export interface AssetGalleryPieceUse {
  use: AssetGalleryUse;
  placed: boolean;
}

/** How sure the research note is that the store images show the piece in use (`docs/design/073-pack-intended-use.md`, "Confidence words"). */
export type AssetGalleryNoteSureness = "seen" | "inferred" | "not-shown";

/** One row of the intended-use note that applies to a piece. Transcribed into a typed table; never parsed from the markdown at run time. */
export interface AssetGalleryNote {
  /** The note's "How the images show it used", as written. */
  text: string;
  /** The store images the row cites (names only, e.g. "Screenshot_11"). Never the images themselves. */
  images: string;
  sure: AssetGalleryNoteSureness;
  /** The note's "Where the plan disagrees" or "Uses taken that the images do not show" line for this piece, if any; else null. */
  departure: string | null;
}

/** One converted piece, as the page shows it. Read from the manifest at run time; nothing is typed in per piece. */
export interface AssetGalleryPiece {
  /** `pack:name`, as every kit table keys it. */
  key: CalibrationKey;
  pack: string;
  /** The GLB root node's name, exactly (`AssetEntry.name`). */
  name: string;
  /** Width (x), height (y), depth (z), metres: the manifest bounds' extents (`sizeOf`). Already include the pack's scale. */
  size_m: readonly [number, number, number];
  triangles: number;
  /** False when the manifest lists no texture for it (`AssetEntry.textures` empty). */
  textured: boolean;
  warnings: readonly AssetWarning[];
  missingTextures: readonly string[];
  /** True when a City Pack key starts with a stem on chapter 16's never-used list (`CITY_NEVER_USED`). Always false for other packs. */
  neverUsed: boolean;
  /** Every use, in `ASSET_GALLERY_USES` order; empty means unused. */
  uses: readonly AssetGalleryPieceUse[];
  notes: readonly AssetGalleryNote[];
}

/** One pack's gallery, from one manifest entry. */
export interface AssetGalleryPack {
  /** The manifest's pack id (`AssetPack.pack`), e.g. "sci-fi-city-pack". */
  pack: string;
  /** A readable name, e.g. "POLYGON Sci-Fi City"; the id when the title table does not know the pack. */
  title: string;
  /** The pack's store page, or null when the table has none. A link only: no store image is fetched or shown. */
  storeUrl: string | null;
  glb: string;
  pieceCount: number;
  /** The FBX the converter could not convert (`AssetPack.failures`): listed in the pack's header, never as cards. */
  failures: readonly AssetFailure[];
}

/** Which pieces the page asks for. */
export interface AssetGalleryQuery {
  pack: string;
  /** Search text: every space-separated term must be in the name, case-insensitive. Empty matches all. */
  text: string;
  /** "any", a use (pieces with that use), or "unused" (pieces with no use). */
  use: AssetGalleryUse | "any" | "unused";
  /** "any", "untextured" (`textured` false), or "warnings" (any warning). */
  flag: "any" | "untextured" | "warnings";
  /** 1-based; clamped to the pages there are. */
  page: number;
}

/** Cards on one page. Thumbnails are drawn for one page at a time, never for the whole pack. */
export const ASSET_GALLERY_PAGE_SIZE = 24;

export interface AssetGalleryPage {
  /** The query as applied (its page clamped to 1..pageCount). */
  query: AssetGalleryQuery;
  /** This page's pieces, sorted by name (code-unit order). */
  pieces: readonly AssetGalleryPiece[];
  /** How many pieces match the query across all pages. */
  total: number;
  /** At least 1. */
  pageCount: number;
}

/**
 * What the renderer gives the ui page (section B implements it, section C drives it). The page owns one canvas and hands it once to `createAssetGallery(canvas, deps?)` (src/render3d/index.ts): the
 * viewer's one WebGL renderer draws on it, both the large inspect view and, off screen, each thumbnail.
 */
export interface AssetGallery {
  /** Resolves once the manifest is read: every pack in the manifest, in manifest order. Resolves to an empty list (never rejects) when there is no manifest; `problem` then says why. */
  packs(): Promise<readonly AssetGalleryPack[]>;
  /** Why the gallery has nothing to show (no manifest, or a manifest this build does not read), or null. */
  problem(): string | null;
  /** The pieces a query asks for. Pure once `packs()` has resolved; an unknown pack gives an empty page. */
  page(q: AssetGalleryQuery): AssetGalleryPage;
  /**
   * Makes `pack` the loaded one: frees the previous pack's GLB (geometry, materials, textures and every thumbnail URL) before fetching this one. Only one pack's GLB is held at a time.
   * Resolves when it is parsed; rejects with a readable message when it cannot be fetched or parsed.
   */
  loadPack(pack: string): Promise<void>;
  /**
   * The thumbnail of a piece of the loaded pack, as an in-memory object URL, or null when its root is not in the GLB. Drawn one at a time, in the order asked; a second ask for the same key
   * gets the cached URL. Never saved anywhere.
   */
  thumbnail(key: CalibrationKey): Promise<string | null>;
  /** Drops every thumbnail asked for and not yet drawn (the page changed). Their promises resolve to null. */
  cancelThumbnails(): void;
  /** Shows a piece of the loaded pack large on the surface: orbit about it, a 5 m module square under it, a 1.8 m person marker beside it, its +z front marked. False when its root is not in the GLB. */
  inspect(key: CalibrationKey): boolean;
  /** Stops the inspect view (the surface is cleared and the render loop stops). */
  closeInspect(): void;
  /** Call when the surface changes size. */
  resize(): void;
  /** Frees the GLB, the thumbnails and the renderer. */
  dispose(): void;
}
