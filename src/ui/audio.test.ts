import { describe, expect, it } from "vitest";
import { AUDIO_PREFS_KEY, DEFAULT_AUDIO_PREFS } from "../core";
import {
  clampVolume,
  parseAudioPrefs,
  readAudioPrefs,
  serializeAudioPrefs,
  sliderToVolume,
  soundToggleLabel,
  volumeToSlider,
  writeAudioPrefs,
  type StorageLike,
} from "./logic";

/** A storage that remembers what was written, and the keys it was asked for. */
function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const keys: string[] = [];
  const storage: StorageLike = {
    getItem(key) {
      keys.push(key);
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
  };
  return { storage, data, keys };
}

describe("the sound prefs contract", () => {
  it("uses the core key and defaults: not muted, volume 0.5", () => {
    expect(AUDIO_PREFS_KEY).toBe("rest.audio");
    expect(DEFAULT_AUDIO_PREFS).toEqual({ muted: false, volume: 0.5 });
  });
});

describe("parseAudioPrefs", () => {
  const defaults = { muted: false, volume: 0.5 };

  it("gives the defaults for a missing value", () => {
    expect(parseAudioPrefs(null)).toEqual(defaults);
    expect(parseAudioPrefs(undefined)).toEqual(defaults);
    expect(parseAudioPrefs("")).toEqual(defaults);
  });

  it("gives the defaults for junk and for the wrong shape", () => {
    for (const raw of ["not json", "{", "null", "42", "true", "[]", '"muted"', "{}", '{"muted":true}']) {
      expect(parseAudioPrefs(raw)).toEqual(defaults);
    }
  });

  it("gives the defaults when muted is not a boolean", () => {
    expect(parseAudioPrefs('{"muted":"yes","volume":0.2}')).toEqual(defaults);
    expect(parseAudioPrefs('{"muted":1,"volume":0.2}')).toEqual(defaults);
  });

  it("gives the defaults for a volume out of range or not a number", () => {
    expect(parseAudioPrefs('{"muted":true,"volume":1.5}')).toEqual(defaults);
    expect(parseAudioPrefs('{"muted":true,"volume":-0.1}')).toEqual(defaults);
    expect(parseAudioPrefs('{"muted":true,"volume":"0.3"}')).toEqual(defaults);
    expect(parseAudioPrefs('{"muted":true}')).toEqual(defaults);
  });

  it("reads a valid saved pair, including the ends of the volume range", () => {
    expect(parseAudioPrefs('{"muted":true,"volume":0.2}')).toEqual({ muted: true, volume: 0.2 });
    expect(parseAudioPrefs('{"muted":false,"volume":0}')).toEqual({ muted: false, volume: 0 });
    expect(parseAudioPrefs('{"muted":false,"volume":1}')).toEqual({ muted: false, volume: 1 });
  });

  it("ignores extra keys", () => {
    expect(parseAudioPrefs('{"muted":true,"volume":0.7,"extra":1}')).toEqual({ muted: true, volume: 0.7 });
  });
});

describe("serializeAudioPrefs", () => {
  it("round-trips through parseAudioPrefs", () => {
    const prefs = { muted: true, volume: 0.33 };
    expect(parseAudioPrefs(serializeAudioPrefs(prefs))).toEqual(prefs);
  });
});

describe("readAudioPrefs and writeAudioPrefs", () => {
  it("reads under AUDIO_PREFS_KEY", () => {
    const { storage, keys } = fakeStorage({ [AUDIO_PREFS_KEY]: '{"muted":true,"volume":0.1}' });
    expect(readAudioPrefs(storage)).toEqual({ muted: true, volume: 0.1 });
    expect(keys).toEqual([AUDIO_PREFS_KEY]);
  });

  it("gives the defaults with no storage, and when storage throws", () => {
    expect(readAudioPrefs(null)).toEqual({ muted: false, volume: 0.5 });
    expect(readAudioPrefs(undefined)).toEqual({ muted: false, volume: 0.5 });
    const broken: StorageLike = {
      getItem() {
        throw new Error("SecurityError");
      },
      setItem() {},
    };
    expect(readAudioPrefs(broken)).toEqual({ muted: false, volume: 0.5 });
  });

  it("writes under AUDIO_PREFS_KEY and reports success", () => {
    const { storage, data } = fakeStorage();
    expect(writeAudioPrefs(storage, { muted: true, volume: 0.25 })).toBe(true);
    expect(data.get(AUDIO_PREFS_KEY)).toBe('{"muted":true,"volume":0.25}');
  });

  it("does not throw when there is no storage or the write is refused", () => {
    expect(writeAudioPrefs(null, { muted: false, volume: 0.5 })).toBe(false);
    const refusing: StorageLike = {
      getItem: () => null,
      setItem() {
        throw new Error("QuotaExceededError");
      },
    };
    expect(writeAudioPrefs(refusing, { muted: false, volume: 0.5 })).toBe(false);
  });
});

describe("clampVolume", () => {
  it("clamps to 0..1 and leaves a value in range alone", () => {
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(0.25)).toBe(0.25);
  });

  it("gives the default for NaN", () => {
    expect(clampVolume(Number.NaN)).toBe(0.5);
  });
});

describe("soundToggleLabel", () => {
  it("names the state: on while audible, off while muted", () => {
    expect(soundToggleLabel(false)).toBe("Sound on");
    expect(soundToggleLabel(true)).toBe("Sound off");
  });
});

describe("the slider mapping", () => {
  it("maps volume to a 0..100 position, rounded", () => {
    expect(volumeToSlider(0.5)).toBe(50);
    expect(volumeToSlider(0.126)).toBe(13);
    expect(volumeToSlider(2)).toBe(100);
    expect(volumeToSlider(-1)).toBe(0);
  });

  it("maps a slider value to a volume, clamped", () => {
    expect(sliderToVolume("50")).toBe(0.5);
    expect(sliderToVolume(0)).toBe(0);
    expect(sliderToVolume(150)).toBe(1);
  });

  it("gives null for a slider value that is not a number", () => {
    expect(sliderToVolume("")).toBeNull();
    expect(sliderToVolume("abc")).toBeNull();
    expect(sliderToVolume(Number.NaN)).toBeNull();
  });
});
