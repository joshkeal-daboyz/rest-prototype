/**
 * The puzzle schema, draft 2. See puzzles/SCHEMA.md.
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

/** Exactly one per puzzle. Power originates here. */
export interface FeedNode extends NodeBase {
  type: "feed";
}

/** Conducts while `closed`. The player toggles it. Marked by the tribe. */
export interface BreakerNode extends NodeBase {
  type: "breaker";
  closed: boolean;
}

/** Conducts only to `outputs[selected]` (line ids leaving this node). Marked by the tribe. */
export interface SwitchNode extends NodeBase {
  type: "switch";
  outputs: readonly [string, string];
  selected: 0 | 1;
  /** A relay can only be thrown while current reaches it. It stays where it was thrown after power is lost. */
  relay?: boolean;
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
  version: 3 | 4;
  scope: Scope;
  /** Max total lamp load the feed carries; null = unlimited. Exceeding it browns the section out. */
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
