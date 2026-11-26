/**
 * The puzzle schema, draft 5. See puzzles/SCHEMA.md.
 * One graph describes a panel (the circuit-fixing minigame inside a fuse box)
 * or a street (fuse boxes, lamps and cables along a street); `scope` says which.
 * These types are the contract between every agent. Change them only through a ticket.
 */

export type Vec2 = readonly [number, number];

export type Scope = "map" | "street";

export type Part = "bulb" | "fuse" | "wire";

export type NodeType = "feed" | "breaker" | "switch" | "fusebox" | "junction" | "lamp" | "battery";

interface NodeBase {
  id: string;
  pos: Vec2;
}

/**
 * A powersource. Power originates here. One per map up to draft 4; draft 5 allows several (ticket 015),
 * each judged against its own capacity (separate pools, never summed into one). Use `puzzleFeeds` (load.ts)
 * to read every feed's effective capacity and display name.
 */
export interface FeedNode extends NodeBase {
  type: "feed";
  /**
   * This feed's limit (max lamp load its own flow carries); null = no limit. Overrides the top-level `capacity`.
   * Required (null allowed) when the map has two or more feeds; optional on a one-feed map. Draft 5.
   */
  capacity?: number | null;
  /** Display name when a map has several feeds ("North"). Absent = the id, underscores as spaces. Draft 5. */
  name?: string;
}

/**
 * A timed breaker's schedule (ticket 081 TB; Josh, 26 Nov 2026: "Real seconds (Recommended)", "Breaker, on/off (Recommended)", "Clock only (Recommended)"). Whole seconds. Closed for `closed`,
 * then open for `open`, repeating; `offset` is where in that cycle it stands when the clock starts (default 0: at the start of its closed share). The clock is the battery's (real seconds,
 * `Grid.advance`) and starts at the player's first move. See puzzles/SCHEMA.md, "Timed breakers".
 */
export interface BreakerTimer {
  readonly closed: number;
  readonly open: number;
  readonly offset?: number;
}

/** The validator's bounds on a timer (ticket 081 TB0): each share 2 to 30 whole seconds, and the map's cycle (the least common multiple of every timer's `closed + open`) at most 60. */
export const TIMER_LIMITS = { minSeconds: 2, maxSeconds: 30, maxCycleSeconds: 60 } as const;

/** Conducts while `closed`. The player toggles it, unless it has a `timer`. Marked by the tribe. */
export interface BreakerNode extends NodeBase {
  type: "breaker";
  /** For a timed breaker, where its timer stands at `offset` (the validator checks they agree). */
  closed: boolean;
  /** A timed breaker (ticket 081 TB): its clock throws it, never the player (a click is refused). Not a fault holder. Absent = a player's breaker. */
  timer?: BreakerTimer;
}

/** Conducts only to `outputs[selected]` (line ids leaving this node). Marked by the tribe. */
export interface SwitchNode extends NodeBase {
  type: "switch";
  outputs: readonly [string, string];
  selected: 0 | 1;
  /** A relay can only be thrown while current reaches it. It stays where it was thrown after power is lost. */
  relay?: boolean;
  /**
   * A spring switch returns to its file `selected` whenever no current reaches it (after any settle), and stays
   * thrown only while powered. Can be combined with `relay`. Absent = false. Ticket 013.
   */
  spring?: boolean;
}

/**
 * Charges at 1 unit/s while live power reaches it through `input` and it is not released, up to `capacity`
 * (units are seconds of discharge). Released, it powers its far side for `charge` seconds, then goes flat.
 */
export interface BatteryNode extends NodeBase {
  type: "battery";
  capacity: number;
  /** Starting charge; default 0. */
  charge?: number;
  /** The line on the feed side. Every other line at the battery is its far side. */
  input: string;
}

/** Takes a fuse. `rating` is the load it carries; more and it blows when powered. Absent = never blows. */
export interface FuseboxNode extends NodeBase {
  type: "fusebox";
  rating?: number;
}

/** A split or bend in the run. Can carry a `dead-junction` fault. */
export interface JunctionNode extends NodeBase {
  type: "junction";
}

/** A leaf. Lit when power reaches it and it has no fault. Never blocks the run. */
export interface LampNode extends NodeBase {
  type: "lamp";
  load?: number;
}

export type GridNode = FeedNode | BreakerNode | SwitchNode | FuseboxNode | JunctionNode | LampNode | BatteryNode;

export interface Line {
  id: string;
  from: string;
  to: string;
  /** Needs a climb to repair (street scope). */
  overhead?: boolean;
}

export type FaultKind = "dead-lamp" | "blown-fuse" | "damaged-cable" | "dead-junction";

export interface Fault {
  id: string;
  /** A node id or a line id, depending on the kind (see FAULT_RULES). */
  at: string;
  kind: FaultKind;
}

export interface SalvageSpot {
  id: string;
  pos: Vec2;
  part: Part | "random";
}

export interface Decor {
  path: readonly Vec2[];
}

export interface Puzzle {
  id: string;
  name: string;
  version: 3 | 4 | 5;
  scope: Scope;
  /**
   * One-feed map: max total lamp load the feed carries (unless the feed sets its own `capacity`); null = unlimited.
   * Exceeding it browns the section out. Multi-feed map (draft 5): unused and must be null; each feed has its own.
   */
  capacity: number | null;
  /** What Enoch brought. Repairs consume these. */
  startingParts?: readonly Part[];
  /** Lamp ids the priests want lit. All lit and no brownout = win. Empty/absent = every lamp. */
  target?: readonly string[];
  /** Lamps the tribe wishes stayed lit (a score, not a win condition). */
  priority?: readonly string[];
  nodes: readonly GridNode[];
  lines: readonly Line[];
  faults: readonly Fault[];
  decor?: readonly Decor[];

  // ---- street scope only ----
  start?: Vec2;
  night?: { minutes: number };
  satchel?: number;
  favor?: { start: number; draw: number; offer: number; reward: number };
  /** How far the raised lamp shows current. */
  lampReach?: number;
  salvage?: readonly SalvageSpot[];
  stores?: { pos: Vec2 };
}

/** What each fault kind sits on, needs, and how long the hold takes (GDD, Decided). */
export const FAULT_RULES: Readonly<
  Record<FaultKind, { at: "lamp" | "fusebox" | "junction" | "line"; part: Part; count: number; holdSeconds: number }>
> = {
  "dead-lamp": { at: "lamp", part: "bulb", count: 1, holdSeconds: 2 },
  "blown-fuse": { at: "fusebox", part: "fuse", count: 1, holdSeconds: 3 },
  "damaged-cable": { at: "line", part: "wire", count: 1, holdSeconds: 4 },
  "dead-junction": { at: "junction", part: "wire", count: 2, holdSeconds: 5 },
};

/** Defaults for the optional numbers. Per-puzzle values override them. */
export const DEFAULTS = {
  lampReach: 5,
  fuseRating: Number.POSITIVE_INFINITY,
  lampLoad: 1,
} as const;
