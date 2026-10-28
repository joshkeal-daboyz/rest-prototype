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

/** One feed's live total against its own limit (ticket 015). */
export interface FeedReadout {
  /** Total load of the lamps this feed's flow carries (nearest feed; see `FeedState.feedOf`). Faulted lamps count 0. */
  load: number;
  /** The feed's effective limit (`puzzleFeeds` in load.ts): its own `capacity`, else the top-level one. null = no limit. */
  capacity: number | null;
  /** `capacity !== null && load > capacity`. Any feed over browns the whole section out. */
  over: boolean;
}

/**
 * Ticket 015 A. STUB until the grid-simulator builds it: nothing fills these yet.
 * The grid-simulator makes `interface GridState extends RepairForecast, FeedState` in src/grid/types.ts and fills
 * it on every settle. `GridState.load` stays the total feed-carried load (the sum of every `feeds` load);
 * `GridState.capacity` becomes the sum of the feeds' capacities, null if any is null: a summary only, never judged.
 */
export interface FeedState {
  /**
   * Per feed id, in the order the feeds appear in the file's `nodes`. Every feed has an entry, powered or not.
   * On a one-feed map: one entry whose `load`/`capacity` equal `GridState.load`/`GridState.capacity`.
   */
  feeds: ReadonlyMap<string, FeedReadout>;
  /**
   * Powered node or line id -> the id of the feed whose flow carries it (fewest hops; on a tie the feed listed
   * first in `nodes`, then the file's `lines` order). Feed flow only: a node or line powered only by a released
   * battery is absent. Each feed maps to itself. A line where two feeds' flows meet is mapped to the feed that
   * entered it first and carries no load across.
   */
  feedOf: ReadonlyMap<string, string>;
}
