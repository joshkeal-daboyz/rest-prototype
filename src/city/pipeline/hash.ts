/** FNV-1a, 32 bit: a copy of `stableHash` in `the deleted 2D map's city.ts` (src/city/ imports only src/core/ and src/city/), pinned against typed-in pairs by `hash.test.ts`. */
export function stableHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
