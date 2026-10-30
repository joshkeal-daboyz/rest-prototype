import { describe, expect, it } from "vitest";
import { relightCues } from "./cues";
import * as R from "./recipes";

/**
 * Ticket 034: the win splash sound is gone. These literals were captured from the code BEFORE it was removed, so the
 * Relight (chimes with their quiet fifth, close, bed, the cue list) and the beat thump are held to what they were.
 */
describe("034 pins: the Relight and the beat are as they were", () => {
  it("relightChime (with its quiet fifth) at index 0, 2 and 5 (cycles)", () => {
    expect(R.relightChime(0)).toEqual([{"freq":323.6343286053632,"attack":0.04,"decay":0,"sustain":1,"release":0.6,"at":0,"kind":"osc","wave":"sine","duration":0.7,"gainDb":-22},{"freq":484.9036048696491,"attack":0.04,"decay":0,"sustain":1,"release":0.6,"at":0,"kind":"osc","wave":"sine","duration":0.7,"gainDb":-30}]);
    expect(R.relightChime(2)).toEqual([{"freq":432,"attack":0.04,"decay":0,"sustain":1,"release":0.6,"at":0,"kind":"osc","wave":"sine","duration":0.7,"gainDb":-22},{"freq":647.2686572107264,"attack":0.04,"decay":0,"sustain":1,"release":0.6,"at":0,"kind":"osc","wave":"sine","duration":0.7,"gainDb":-30}]);
    expect(R.relightChime(5)).toEqual([{"freq":323.6343286053632,"attack":0.04,"decay":0,"sustain":1,"release":0.6,"at":0,"kind":"osc","wave":"sine","duration":0.7,"gainDb":-22},{"freq":484.9036048696491,"attack":0.04,"decay":0,"sustain":1,"release":0.6,"at":0,"kind":"osc","wave":"sine","duration":0.7,"gainDb":-30}]);
  });
  it("relightClose", () => {
    expect(R.relightClose()).toEqual([{"freq":216,"attack":0.3,"decay":0,"sustain":1,"release":2,"at":0,"kind":"osc","wave":"sine","duration":2.4,"gainDb":-28},{"freq":323.6343286053632,"attack":0.3,"decay":0,"sustain":1,"release":2,"at":0,"kind":"osc","wave":"sine","duration":2.4,"gainDb":-28}]);
  });
  it("relightBed", () => {
    expect(R.relightBed(1, 1)).toEqual([{"freq":54,"attack":0.3,"decay":0,"sustain":1,"release":1.5,"at":0,"kind":"osc","wave":"triangle","filter":{"type":"lowpass","freq":200,"freqTo":2000,"glideTime":1,"q":0.7},"duration":2.5,"gainDb":-24},{"freq":108,"attack":0.3,"decay":0,"sustain":1,"release":1.5,"at":0,"kind":"osc","wave":"sine","filter":{"type":"lowpass","freq":200,"freqTo":2000,"glideTime":1,"q":0.7},"duration":2.5,"gainDb":-24}]);
    expect(R.relightBed(2.5, 3)).toEqual([{"freq":54,"attack":0.3,"decay":0,"sustain":1,"release":1.5,"at":0,"kind":"osc","wave":"triangle","filter":{"type":"lowpass","freq":200,"freqTo":2000,"glideTime":3,"q":0.7},"duration":4,"gainDb":-24},{"freq":108,"attack":0.3,"decay":0,"sustain":1,"release":1.5,"at":0,"kind":"osc","wave":"sine","filter":{"type":"lowpass","freq":200,"freqTo":2000,"glideTime":3,"q":0.7},"duration":4,"gainDb":-24}]);
  });
  it("relightCues for [0.25, 0.25, 0.9, 2.65] over 3 s", () => {
    expect(relightCues([0.25, 0.25, 0.9, 2.65], 3)).toEqual([{"name":"relight:bed","at":0,"voices":[{"freq":54,"attack":0.3,"decay":0,"sustain":1,"release":1.5,"at":0,"kind":"osc","wave":"triangle","filter":{"type":"lowpass","freq":200,"freqTo":2000,"glideTime":3,"q":0.7},"duration":4.15,"gainDb":-24},{"freq":108,"attack":0.3,"decay":0,"sustain":1,"release":1.5,"at":0,"kind":"osc","wave":"sine","filter":{"type":"lowpass","freq":200,"freqTo":2000,"glideTime":3,"q":0.7},"duration":4.15,"gainDb":-24}],"ducks":true,"group":"relight"},{"name":"relight:chime:0","at":0.25,"voices":[{"freq":323.6343286053632,"attack":0.04,"decay":0,"sustain":1,"release":0.6,"at":0,"kind":"osc","wave":"sine","duration":0.7,"gainDb":-22},{"freq":484.9036048696491,"attack":0.04,"decay":0,"sustain":1,"release":0.6,"at":0,"kind":"osc","wave":"sine","duration":0.7,"gainDb":-30}],"ducks":true,"group":"relight"},{"name":"relight:chime:1","at":0.9,"voices":[{"freq":384.8682462366266,"attack":0.04,"decay":0,"sustain":1,"release":0.6,"at":0,"kind":"osc","wave":"sine","duration":0.7,"gainDb":-22},{"freq":576.6508170014549,"attack":0.04,"decay":0,"sustain":1,"release":0.6,"at":0,"kind":"osc","wave":"sine","duration":0.7,"gainDb":-30}],"ducks":true,"group":"relight"},{"name":"relight:chime:2","at":2.65,"voices":[{"freq":432,"attack":0.04,"decay":0,"sustain":1,"release":0.6,"at":0,"kind":"osc","wave":"sine","duration":0.7,"gainDb":-22},{"freq":647.2686572107264,"attack":0.04,"decay":0,"sustain":1,"release":0.6,"at":0,"kind":"osc","wave":"sine","duration":0.7,"gainDb":-30}],"ducks":true,"group":"relight"},{"name":"relight:close","at":2.65,"voices":[{"freq":216,"attack":0.3,"decay":0,"sustain":1,"release":2,"at":0,"kind":"osc","wave":"sine","duration":2.4,"gainDb":-28},{"freq":323.6343286053632,"attack":0.3,"decay":0,"sustain":1,"release":2,"at":0,"kind":"osc","wave":"sine","duration":2.4,"gainDb":-28}],"ducks":true,"group":"relight"}]);
  });
  it("beatThump", () => {
    expect(R.beatThump()).toEqual([{"freq":54,"attack":0.01,"decay":0,"sustain":1,"release":0.3,"at":0,"kind":"osc","wave":"sine","duration":0.35,"gainDb":-28},{"freq":108,"attack":0.004,"decay":0,"sustain":1,"release":0.08,"at":0,"kind":"osc","wave":"sine","duration":0.1,"gainDb":-42}]);
  });
});
