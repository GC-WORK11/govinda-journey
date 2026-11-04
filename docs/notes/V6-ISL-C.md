# V6-ISL-C — L05 Ent compute yard

What: same carry-slabs-to-matching-laptops challenge, re-dressed as a compute yard — server rack with ember LEDs, crate stack and warm work light beside the lift, four laptop screens glowing warm from idle (ember → share hue on dock). Story lectern east of the entry path opens a paper card (`card.v5.tsx`) with line + tech + real Ent/Paper links from registry.
Status: committed c6d3f34, tsc clean; code-reviewed (colliders invisible, placements clear of corridor/laptops/lift/gap). NOT yet run in-browser (Chrome runs banned — box saturated).

Draw-call pass: Govinda measured L05 at 497 calls (worst island). Every static piece — desk, plinths, laptop shells, deck pier/rails/stairs, shard, lift cradle, yard rack/crates/light, lectern, entry disc — is painted + merged into one vertex-coloured mesh (`Statics`), walkable statics into one more (`WalkStatics`), the pad shell incl. mast/hub/hinge into a pad-local merge that still rides the lift (`LiftPad`), each slab's two boxes into `chunkGeo`, and wifi arcs / rack LEDs / trim strips into single merged geos. Blockers + pad walk are invisible-material meshes (zero draws). Remaining separate meshes are only the animated-material pieces: 4 screens, 4 slabs, 4 cables, 4 segments, 4 beads, trim, small ember bulbs. castShadow only on merged shells, slabs, plank, lantern. Expected L05-subtree: ~30 main + ~8 shadow = ~38 calls (was ~250+); remainder is diorama (ART), ART packs and neighbours.

## To verify (QA / Govinda)
- URL: `http://localhost:5190/?qa&at=L05&unlock&lite` (drop `&lite` for the full-fidelity look)
- Check at 1440x900 and 390x844, real input (no teleports):
  1. Walk right off the entry path to the lectern — E opens the Ent card: line, story, tech ("53.7% less GPU memory"), Ent + Paper links (pill buttons, real `target=_blank` hrefs). Esc/E/backdrop closes, player unfreezes.
  2. Four laptop screens glow warm ember before any slab lands (no neon).
  3. E at the east gap edge lays the plank (needs `build`, granted by `&unlock`); walk the plank to the shard.
  4. Carry each slab (E) to the size-matching laptop; wrong laptop slides it back gently. Ring on the lift mast fills per correct pair.
  5. At 4/4, cables light laptop→lift in sequence; step on the pad, E rides up to the deck; `done` + `power` land via complete() — and Chrome.tsx already echoes `tech` + `place · badge` as the caption.
  6. Yard reads as a compute yard: rack with ember status LEDs, crates, work light by the lift; laptop LED stays hue-coded as the size hint.
- My ready-made driver (same walk/E pattern as scripts/v5/play.mjs, real key + joystick input): `/tmp/gj-v6-l05.mjs` — `node /tmp/gj-v6-l05.mjs both` inside withChrome; writes proofs/v6/v6-{1440,390}-l05-*.png. Or `node scripts/v5/play.mjs --only=L05` for the solver path (card needs the lectern E path above).
