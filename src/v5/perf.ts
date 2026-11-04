/**
 * Cold-load journey marks. Anything on the path to the first playable frame
 * flips a flag here or stamps a `fj:*` performance mark; scripts/v7/coldload.mjs
 * reads them back through the standard Performance API. No DOM, no deps.
 */
export const fj = {
  /** the real <Player /> committed (input installs in the same commit) */
  player: false,
  /** the island underfoot's lazy Obstacle + Diorama chunks are in the module cache */
  l01: false,
  /** student.glb finished downloading (resource timing saw it) */
  glb: false,
}

export const mark = (n: string) => {
  try {
    performance.mark(n)
  } catch {
    /* marking must never break the game */
  }
}
