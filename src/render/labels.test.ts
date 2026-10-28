import { describe, expect, it } from "vitest";
import { feedAlarm, feedName, feedUsing, fuseCaption, lampCaption } from "./labels";

describe("map captions (ticket 014 A)", () => {
  it("lamp and fuse captions are levels", () => {
    expect(lampCaption(2)).toBe("Lv2 Lamp");
    expect(fuseCaption(3)).toBe("Lv3 Fuse");
    expect(fuseCaption(undefined)).toBe("");
  });
  it("feed name and live total", () => {
    expect(feedName(4)).toBe("Lv4 Powersource");
    expect(feedName(null)).toBe("Powersource");
    expect(feedUsing(3, 4)).toBe("using 3 of 4");
    expect(feedUsing(3, null)).toBe("using 3");
    expect(feedAlarm(5, 4)).toBe("! using 5 of 4 !");
  });
});
