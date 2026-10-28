/**
 * Fields the simulator's `GridState` (src/grid/types.ts) must report, cut by the lead-architect ahead of the build.
 * Types only. `GridState` itself lives in src/grid/ (grid-simulator's folder); these are the contract it extends.
 */

/**
 * Ticket 013 A. STUB until the grid-simulator builds it: nothing fills `wouldBlow` yet.
 * The grid-simulator makes `interface GridState extends RepairForecast` in src/grid/types.ts and fills it on every settle.
 */
export interface RepairForecast {
  /**
   * Keys: every fusebox id with a **readable** blown-fuse fault (and no others).
   * Value: the load that fusebox would carry if its fuse were fitted now, with nothing else changed (the same
   * number the blow check would compare against `rating`) when that load exceeds `rating`; 0 if the new fuse would hold.
   * An unrated fusebox always maps to 0. A sprung switch has already returned before this is computed.
   */
  wouldBlow: ReadonlyMap<string, number>;
}
