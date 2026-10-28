/**
 * The puzzle schema, draft 2. See puzzles/SCHEMA.md.
 * One graph describes a panel (the circuit-fixing minigame inside a fuse box)
 * or a street (fuse boxes, lamps and cables along a street); `scope` says which.
 * These types are the contract between every agent. Change them only through a ticket.
 */

export type Vec2 = readonly [number, number];

export type Scope = "panel" | "street";

export type Part = "bulb" | "fuse" | "wire";

export type NodeType = "feed" | "breaker" | "switch" | "fusebox" | "junction" | "lamp";

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
}

/** Takes a fuse. In a panel, `rating` is the load it carries; more and it blows when powered. */
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

export type GridNode = FeedNode | BreakerNode | SwitchNode | FuseboxNode | JunctionNode | LampNode;

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
  version: 2;
  scope: Scope;
  start: Vec2;
  night: { minutes: number };
  satchel: number;
  favor: { start: number; draw: number; offer: number; reward: number };
  /** Street: how far the raised lamp shows current. */
  lampReach?: number;
  /** null = unlimited; a number = max lamps lit at once (Draft in the GDD). */
  capacity: number | null;
  /** Panel: night seconds one probe costs. */
  probeSeconds?: number;
  /** Panel: night seconds the "fetch parts" stand-in costs, until the street layer exists. */
  fetchSeconds?: number;
  /** Panel: what the satchel holds when the panel opens. */
  startingParts?: readonly Part[];
  nodes: readonly GridNode[];
  lines: readonly Line[];
  faults: readonly Fault[];
  salvage: readonly SalvageSpot[];
  stores?: { pos: Vec2 };
  decor?: readonly Decor[];
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
  probeSeconds: 3,
  fetchSeconds: 90,
  fuseRating: Number.POSITIVE_INFINITY,
  lampLoad: 1,
} as const;
