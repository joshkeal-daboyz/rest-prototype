/**
 * The itch.io build (ticket 083). A production build that plays the city with the game pack beside it, zipped for a
 * password-protected itch.io HTML5 page.
 *
 * Licence (Josh, 26 Nov 2026, on a card: "Password page, include"): the game pack's GLBs and textures go in this zip, for a
 * password-protected page only; he accepted that an invited tester could pull the files out. This supersedes the dev-only rule of
 * 16 Nov 2026 for this build alone. A plain `npm run build` (GitHub Pages) still carries no pack and still stops at its notice.
 * Nothing here is ever committed or deployed by CI: the zip is written to the git-ignored ITCH_OUT_DIR on Josh's machine.
 */

/** The Vite mode of the itch build (`vite build --mode itch --base ./`). Code asks `import.meta.env.MODE === ITCH_BUILD_MODE`. */
export const ITCH_BUILD_MODE = "itch" as const;

/** Where `npm run build:itch` writes, relative to the repo root. Git-ignored; the script refuses to write if it is not. */
export const ITCH_OUT_DIR = "dist-itch/" as const;

/**
 * itch.io's HTML5 upload limits, as the ticket read them (itch.io/docs/creators/html5). The builder re-reads that page and corrects
 * these numbers in the same PR if they differ, saying so in the reply. The zip check fails a package that passes any of them.
 */
export const ITCH_LIMITS = {
  /** Most files in the extracted zip. */
  maxFiles: 1000,
  /** Largest total extracted size, bytes. */
  maxTotalBytes: 500 * 1024 * 1024,
  /** Largest single file, bytes. */
  maxFileBytes: 200 * 1024 * 1024,
} as const;

/** One file bound for the zip: its path inside the zip (forward slashes, no leading "/", no ".."), and its size. */
export interface ItchFile {
  path: string;
  bytes: number;
}

/**
 * Why a package was refused. Every problem is listed, not just the first, and any problem means no zip is written.
 * - `missing-key`: a `pack:name` the game loads (`gameModelKeys()`, or an `FX_MESHES` key) is not an entry of its pack in the game manifest.
 * - `missing-file`: a file the game manifest names (a GLB, a colourway image, an `fx` texture) is not on disk.
 * - `missing-colourway`: a colourway id the game fetches (`gameColourways()`) is not in the game manifest.
 * - `missing-fx`: an `FX_TEXTURES` id is not in the game manifest's `fx`.
 * - `stale`: the game manifest's `game.from` is not the full manifest's `generatedAt` (a conversion ran since the cut).
 * - `no-game-pack`: there is no readable game manifest at all.
 * - `limit`: an ITCH_LIMITS bound is passed (`detail` names which, and the number).
 * - `outside-plan`: a file would enter the zip from anywhere but the build output, the game pack folder or the saved calibration file.
 */
export type ItchProblemKind = "missing-key" | "missing-file" | "missing-colourway" | "missing-fx" | "stale" | "no-game-pack" | "limit" | "outside-plan";

export interface ItchProblem {
  kind: ItchProblemKind;
  /** The key, path, id or limit concerned, as printed. */
  detail: string;
}
