/**
 * The picks table (ticket 081 D3): Josh's model for each puzzle component, transcribed from `docs/design/081-component-picks.md` (23 Nov 2026, chosen on cards).
 * `key` is the gallery's `pack:name`. A null key draws as a placeholder. `spring` and `junction` share one model on purpose; the overlay icon tells them apart.
 */

import type { CircuitComponent, CircuitComponentPick } from "../core";

const DATE = "2026-11-23";

export const COMPONENT_MODELS: Record<CircuitComponent, CircuitComponentPick> = {
  feed: { component: "feed", key: "palm-city-pack:SM_Prop_Powerpole_03", words: "C: Palm Powerpole_03", date: DATE },
  breaker: { component: "breaker", key: "sci-fi-city-pack:SM_Prop_WallAttach_Electronics_01", words: "B: SciFi Electronics_01", date: DATE },
  switch: { component: "switch", key: "sci-fi-city-pack:SM_Prop_WallAttach_Electronics_05", words: "D: SciFi Electronics_05", date: DATE },
  relay: { component: "relay", key: "sci-fi-city-pack:SM_Prop_WallAttach_Electronics_04", words: "C: SciFi Electronics_04", date: DATE },
  spring: { component: "spring", key: "sci-fi-city-pack:SM_Prop_WallAttach_Electronics_03", words: "C: SciFi Electronics_03", date: DATE },
  fusebox: { component: "fusebox", key: "sci-fi-city-pack:SM_Prop_WallAttach_Electronics_02", words: "D: SciFi Electronics_02", date: DATE },
  junction: { component: "junction", key: "sci-fi-city-pack:SM_Prop_WallAttach_Electronics_03", words: "B: SciFi Electronics_03", date: DATE },
  battery: { component: "battery", key: "sci-fi-frontier-pack:SM_Prop_Battery_05", words: "D: Frontier Battery_05", date: DATE },
  lampBuilding: { component: "lampBuilding", key: "palm-city-pack:SM_Prop_Light_Wall_01", words: "B: Palm Light_Wall_01", date: DATE },
  lampPost: { component: "lampPost", key: "sci-fi-city-pack:SM_Prop_Streetlight_01", words: "C: SciFi Streetlight_01", date: DATE },
  damagedLine: { component: "damagedLine", key: "sci-fi-frontier-pack:SM_Prop_Cable_09", words: "D: Frontier Cable_09", date: DATE },
  roofMast: { component: "roofMast", key: "sci-fi-frontier-pack:SM_Prop_Power_Pole_03", words: "D: Frontier Power_Pole_03", date: DATE },
};
