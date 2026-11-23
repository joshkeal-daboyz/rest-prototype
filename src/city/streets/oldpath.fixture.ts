/**
 * Ticket 070 L2a: what `streets/equal.test.ts` compared `layStreets` with, as typed values. One FNV-1a digest (`stableHash` of `canonicalJson`) per city, taken from the old `tileCity` at b42b65f
 * while both paths existed: its `streets`, its blocks reduced to id, bi, bj, i0, i1, j0, j1 and type, and its street cells' base roles (the sorted `"i,j"` entries of `[role, street]`, a 2-cell piece
 * expanded onto its next cell, `parking`, `buildout` and `parkingPlain` read as `parkingPlain`, `kerbCut` as `pavement`; lot and plaza cells left out).
 */
export interface OldLatticeDigest {
  streets: number;
  blocks: number;
  cells: number;
}
export const OLD_LATTICE_DIGESTS: Record<string, OldLatticeDigest> = {
  "3x3s1": { streets: 3692236312, blocks: 1099653582, cells: 2257181998 },
  "3x3s2": { streets: 3039094024, blocks: 504303675, cells: 3802552847 },
  "3x3s3": { streets: 865635103, blocks: 2233988452, cells: 852809385 },
  "3x3s4": { streets: 3065772266, blocks: 1220633446, cells: 744495866 },
  "3x3s5": { streets: 2926031163, blocks: 1244899897, cells: 2348803115 },
  "3x3s6": { streets: 778076796, blocks: 2287653928, cells: 2809124774 },
  "3x3s7": { streets: 2444549366, blocks: 1142820433, cells: 706403673 },
  "3x3s8": { streets: 2262940435, blocks: 200537905, cells: 1340042464 },
  "3x3s9": { streets: 3818446521, blocks: 2197307593, cells: 3541300740 },
  "3x3s10": { streets: 1484263921, blocks: 3526045387, cells: 4072494421 },
  "6x4s1": { streets: 2993915388, blocks: 3180485596, cells: 1981273005 },
  "6x4s2": { streets: 3391520987, blocks: 1555322574, cells: 111796686 },
  "6x4s3": { streets: 1212694009, blocks: 597989149, cells: 3836811716 },
  "6x4s4": { streets: 2788641096, blocks: 1266502157, cells: 494238123 },
  "6x4s5": { streets: 2678778958, blocks: 4182292991, cells: 120511144 },
  "6x4s6": { streets: 3976790741, blocks: 2747542700, cells: 1890438397 },
};
