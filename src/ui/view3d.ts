/**
 * Which renderer the page asks for (ticket 081 A2d). Pure: the address and the kind of puzzle arrive as values, nothing is read here.
 * A schematic puzzle has no city form yet, so `?view=3d` on it opens the 2D map (the default Josh may overturn later). A city route
 * (`city=tiles` or `city=plan`, with or without `sheet=1`) still asks for the 3D renderer, and so does a city puzzle (from U1 on).
 */

/** A schematic puzzle (`puzzles/NN-*.json`) or a city puzzle (`puzzles/city/`, from U1 on). */
export type PuzzleKind = "schematic" | "city";

/** The `city=` routes that open the 3D renderer. Any other value does not. */
const CITY_ROUTES: readonly string[] = ["tiles", "plan"];

/** The console line for `?view=3d` on a puzzle that opens on the 2D map. */
export const NO_CITY_FORM_NOTICE = "3D view: this puzzle has no city form yet";

/** True when the page should build the 3D renderer: `view=3d` is in the address, and either a city route is named or the puzzle is a city puzzle. */
export function wants3d(search: string, puzzleKind: PuzzleKind): boolean {
  const q = new URLSearchParams(search);
  if (q.get("view") !== "3d") return false;
  if (puzzleKind === "city") return true;
  return CITY_ROUTES.includes(q.get("city") ?? "");
}
