/**
 * The Relight's sound cues (ticket 019), pure. The timing comes from the renderer's plan (`planRelight`, passed in so this file imports nothing from `src/render/`).
 * Hidden ids (ticket 081 S1: the scenery lamps the conversion adds) get no ignition time, so the Relight chimes once per lamp the puzzle names (081 U3, open question 11).
 * The duration is the plan's, unchanged.
 */

/** The part of `planRelight`'s result the cues read: each lit lamp's id in ignition order, each node's arrival time by node index, and the total length. */
export interface RelightTiming {
  readonly lampOrder: readonly string[];
  readonly nodeArrive: ArrayLike<number>;
  readonly duration: number;
}

/** Ignition times (seconds) for the file's lit lamps only, in ignition order, and the cascade's length. */
export function relightCues(
  plan: RelightTiming,
  nodeIds: readonly string[],
  hidden: readonly string[] = [],
): { igniteAt: number[]; duration: number } {
  const nodeIndex = new Map(nodeIds.map((id, i) => [id, i] as const));
  const silent = new Set(hidden);
  const igniteAt = plan.lampOrder
    .filter((id) => !silent.has(id))
    .map((id) => plan.nodeArrive[nodeIndex.get(id) ?? 0] ?? 0);
  return { igniteAt, duration: plan.duration };
}
