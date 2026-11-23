/**
 * Ticket 055 B, criterion 9: nothing moves on the ladder. The digests below were taken from `townLayout(p)` and `townLayout(p, { terraces: false })` for every
 * `puzzles/*.json` on the section's base commit (2f7a0bf22ed11ec4a87f50acae9145a17fc26b0d, the tip of ticket/055a-tile-grid), BEFORE the terrace fill was extracted from
 * `build` into `terraceBlockRows`. Each is the first 20 hex digits of the SHA-256 of `JSON.stringify(town)`: every road, kerb, pavement, pad, block, lot, terrace run,
 * open lot, place, the ring and the window, to the last digit. A new puzzle file is not in the table and fails the "every map is pinned" test: add its two digests then
 * (they pin a layout that is correct today, not one that must never change: a ticket that moves the ladder's towns on purpose re-pins and says so).
 */

import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { loadPuzzle } from "../core";
import { townLayout } from "./town";

/** [with terraces, with { terraces: false }] */
const PINS: Readonly<Record<string, readonly [string, string]>> = {
  "01-first-light.json": ["046a7437bcefb47752b5", "5a5647441b52555cf962"],
  "02-this-way-or-that.json": ["19e8b11d5a8c2e966f10", "87c6fdf63fbdd9bacb34"],
  "03-not-enough-for-all.json": ["8eee22143dfdaeed6d9d", "1279e52ea7767997ec28"],
  "04-the-tired-feed.json": ["490c0a86e5eb1596a2ea", "80952f0c3a584d1c7caf"],
  "05-two-feeds.json": ["ad7c1a6871d8fccb44d9", "df79c5964c933ffddcd1"],
  "06-the-spark.json": ["25398663572df2e89b62", "fff377f58a4eee5e61bf"],
  "07-past-the-fuse.json": ["5c3777fb0594557ca387", "49c826d55555b0c03fc1"],
  "08-where-it-stops.json": ["37004f41af4deed54c4b", "896a7459030224852005"],
  "09-shrine-circuit.json": ["035bbd14b8a9e862d316", "2ea6058a27259aebbd2a"],
  "10-around-the-dead-post.json": ["5b41e1289ee668704a7f", "6e0f52ef2435c5a8f86b"],
  "11-the-small-fuse.json": ["deb9ae4537caf59b64f4", "06616e8f280df16b1ee7"],
  "12-which-fuse.json": ["379504628306dd43bbb5", "bf5c544089316ae7ff1c"],
  "13-one-box-three-lamps.json": ["4379a4ed37c5c21b8352", "5c6c968bca0b2eceb1db"],
  "14-ring-from-the-east.json": ["d96b39ac47554bb41912", "11129f65e36573504864"],
  "15-meet-in-the-middle.json": ["82ce087dbbec4134c05c", "6cc2b1854934d5eca771"],
  "16-behind-the-first.json": ["22a2896e829b0536a8bf", "94f9bd86c908640f61ee"],
  "17-count-the-dark.json": ["9fb0b5ce192d74bc0a17", "26629cd58db76584609a"],
  "18-the-long-way-round.json": ["b5d2d4744b56773585aa", "68ea9bebe0eee143bad7"],
  "19-why-it-blew.json": ["3c86961fee410b13d7a1", "1f37ccd1671e524b0dcd"],
  "20-battery-run.json": ["98f3018f17ff84642289", "64313faf6bc8f4a62c39"],
  "21-wake-the-relay.json": ["954f5f0df78d80284f34", "9797d5a5e7fc9b61b652"],
  "22-look-both-ways.json": ["8e0e1948ebbfbeaccc17", "4582e3b86778d0a3a9cf"],
  "23-make-room.json": ["6f462c078a753bb43ee5", "9ce1c549c242714f3ee5"],
  "24-one-wire.json": ["13325646080463838da5", "eed10b75b8b755dad8d3"],
  "25-only-the-relays.json": ["3425516dcbe834c14531", "b2e59bcf4bc66c596de7"],
  "26-far-one-first.json": ["d6bbb90bcaa5642c3c6d", "d055b96cbbc87ae52b78"],
  "27-switch-before-breaker.json": ["840302c190ae8905da1b", "c311fefea73656b7f8bc"],
  "28-last-light.json": ["97533245f85ff4d838ee", "bedc24642721d50199e4"],
  "29-open-point.json": ["d4062445db5c35350aa4", "25f2df502c1d8c9d26a3"],
  "30-which-break.json": ["affa3844d6f320d0a772", "b0131ab39181cdbc05f9"],
  "31-leave-the-ring-open.json": ["9dbadf4c93c5c0767253", "7b601cbfb43be9a13da7"],
  "32-read-it-in-the-window.json": ["c2ad8f3e28bef998f9cf", "6f2d6214982618ea740a"],
  "33-take-the-feed-out.json": ["fe161e03d9b3c7d49701", "5f17e1d889693b3b6d31"],
  "34-main-fuse.json": ["787fbf3d9969cc918d8d", "7bff61b5d49af014ef32"],
  "35-cell-light.json": ["8ef6564ab66426986b63", "85383fad29ba68057981"],
  "36-set-it-dark.json": ["b70b8ac3771b25df6b4c", "8c97cc4eeed0d9a3cbe2"],
  "37-spend-the-fuse-first.json": ["6add01363b4a5dcb1e4a", "d7a5a264918d36b0c291"],
  "38-look-behind.json": ["e18e7d5db8e0e664e8c8", "0b64642524430e4f706c"],
  "39-what-is-left.json": ["f69eda26c504b45ce677", "b593c0635dc7366ce433"],
  "40-the-priests-list.json": ["32f9993d1454c242fc5b", "f786d26dc5c57d483fae"],
  "41-room-to-charge.json": ["40eb8b2d317d55ec8036", "8f080ff43da016b56605"],
  "42-two-windows.json": ["ddc53f3a8a687d7ce055", "64e0916f8a7343daf313"],
  "43-parent-fuse.json": ["a2255e90b53fd59eb9da", "61609a39ec0eb4e6b5d1"],
  "44-set-in-the-light.json": ["1c803ba227257c08dd41", "e8eafa01c146691e3c4a"],
  "45-live-relays.json": ["a5e7f925fd7602928f58", "0f560c1bde11b7bdf41e"],
  "46-read-it-from-behind.json": ["a24d0036a917e7e61802", "8496b6ee0f96ece22595"],
  "47-open-point.json": ["d81a16bf865d491693f8", "05d4fd445211e735b69d"],
  "48-the-old-arrangement.json": ["1e3b763f01230987d7b7", "4947e774b0c9ed879bee"],
  "49-two-cells.json": ["c086a13daec073b37c97", "d16b6ab01324049c455e"],
  "50-the-whole-quarter.json": ["6f178a047f26cf96247a", "33995d151767fdcebb5d"],
  "51-thrown-twice.json": ["ca9cbbeef139222eefff", "a76e387267879e337a08"],
  "52-wire-short.json": ["a5b97fbea35cf95aec20", "edeb93a8e99adffa542f"],
  "53-from-behind.json": ["ffbb42cbdad955e25279", "87d41bf599eae5f06d8e"],
  "54-the-whole-circuit.json": ["4c77a8451547309f1734", "2cc76cb6ca05ddcc5575"],
  "55-leave-it-blown.json": ["002e40f12ada84d99662", "9a354b83bcd745c1d65e"],
  "56-whole-ward.json": ["1e42104229b5fc8a7569", "a8058d0c6d39ca4e7450"],
  "57-the-back-door.json": ["a393606846b9e3ef9e4d", "d3524ae2a8be7be88110"],
  "58-keep-it-live.json": ["d767f2f1b92a74cdf67f", "557ef505685558c4b804"],
  "59-move-the-meeting.json": ["c4deb84e4778b2bb148e", "22838e0c3376bf819883"],
  "60-hold-the-spring.json": ["02a513268c8c2ffe51c2", "559c0c32f23423aded00"],
  "61-charge-it-first.json": ["bb5d38369685092feb27", "5df882163dd3b84ef40d"],
  "62-two-springs.json": ["7fe0b5332ba256628d7e", "a2c5736da1a5ded996c5"],
  "63-keep-the-wire.json": ["167fe79bc01f8a3fe716", "3b094dc2c4f2c163d5d9"],
  "64-the-whole-chain.json": ["4e7331e1d70c9862586e", "cb0b764c4041b870ef2b"],
  "lamp-row.grid.json": ["abad7fb394c9ce46dc6a", "ae50ba2d4d11291f5e07"],
  // Taken at K1's tip (56bdec6, on the map of 4c46da7), not on 2f7a0bf; it pins today's layout.
  "city-two-ways-round.json": ["8214ecfde10505394254", "03731a8c8c18f6ce58cb"],
};

const digest = (t: unknown): string => createHash("sha256").update(JSON.stringify(t)).digest("hex").slice(0, 20);
const files = readdirSync("puzzles")
  .filter((f) => f.endsWith(".json"))
  .sort();

describe("the ladder's town layouts do not move (criterion 9)", () => {
  it("pins every puzzles/*.json, and nothing else", () => {
    expect(files).toEqual(Object.keys(PINS).sort());
  });

  it("lays out every map, with and without terraces, exactly as on the base commit", () => {
    const bad: string[] = [];
    for (const f of files) {
      const pin = PINS[f];
      if (!pin) continue;
      const p = loadPuzzle(JSON.parse(readFileSync(`puzzles/${f}`, "utf8")));
      if (digest(townLayout(p)) !== pin[0]) bad.push(`${f} with terraces`);
      if (digest(townLayout(p, { terraces: false })) !== pin[1]) bad.push(`${f} without terraces`);
    }
    expect(bad).toEqual([]);
  });
});
