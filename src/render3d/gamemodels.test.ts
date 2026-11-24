import { describe, expect, it } from "vitest";
import { COMPONENT_MODELS } from "./componentmodels";
import { cityLoadLists, gameModelKeys, schematicLoadLists } from "./gamemodels";
import { listedKeys } from "./pageloads";

describe("gameModelKeys", () => {
  it("is sorted and unique, and holds every key either page call asks for and every circuit component's model", () => {
    const keys: string[] = gameModelKeys();
    expect(keys).toEqual([...new Set(keys)].sort());
    const asked = [...listedKeys(schematicLoadLists()), ...listedKeys(cityLoadLists())];
    expect(asked.length).toBeGreaterThan(100);
    expect(asked.filter((k) => !keys.includes(k))).toEqual([]);
    const components = Object.values(COMPONENT_MODELS).flatMap((c) => (c.key === null ? [] : [c.key]));
    expect(components.filter((k) => !keys.includes(k))).toEqual([]);
  });
});
