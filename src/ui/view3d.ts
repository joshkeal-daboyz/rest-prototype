/**
 * What the page builds for the address (ticket 081 A2d, U2). Pure: the address arrives as a value, nothing is read here.
 * Every puzzle is a city puzzle on the 3D city; only a `city=tiles` or `city=plan` debug route changes what is built.
 */

/** The `city=` debug routes, drawn with no city option. Any other value plays the puzzle. */
const CITY_ROUTES: readonly string[] = ["tiles", "plan"];

/** What the page builds for a city puzzle (ticket 081 U2): `play` is the puzzle on the city view; `route` is a `city=tiles` or `city=plan` debug route, drawn with no city option. */
export type PageView = "play" | "route";

/** The page's view for the address. Every puzzle is a city puzzle now (full 3D), so only a city route changes what is built. Pure. */
export function pageView(search: string): PageView {
  const city = new URLSearchParams(search).get("city") ?? "";
  return CITY_ROUTES.includes(city) ? "route" : "play";
}
