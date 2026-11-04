# V6-ISL-C — L05 Ent compute yard

What: same carry-slabs-to-matching-laptops challenge, re-dressed as a compute yard — server rack with ember LEDs, crate stack and warm work light beside the lift, four laptop screens glowing warm from idle (ember → share hue on dock). Story lectern east of the entry path opens a paper card (`card.v5.tsx`) with line + tech + real Ent/Paper links from registry.
Status: committed c6d3f34, tsc clean; code-reviewed (colliders invisible, placements clear of corridor/laptops/lift/gap). NOT yet run in-browser (Chrome runs banned — box saturated).

Draw-call pass: every static piece — desk, plinths, laptop shells, deck pier/rails/stairs, shard, lift cradle, yard rack/crates/light, lectern, entry disc — is painted + merged into one vertex-coloured mesh (`Statics`), walkable statics into one more (`WalkStatics`), the pad shell incl. mast/hub/hinge into a pad-local merge that still rides the lift (`LiftPad`), each slab's two boxes into `chunkGeo`, wifi arcs / rack LEDs / trim strips into single merged geos, and the whole diorama (tree/table/shells/cables/mugs) into `useStaticGeo`. Blockers + pad walk are invisible-material meshes (zero draws). castShadow only on merged shells, slabs, plank, lantern.

Honest counts (Govinda's measurement: 395 calls / 195k tris at L05, was 497): obstacle subtree ≈40, diorama ≈50→~13, plank 3→1 — **L05-owned files ≈50 total**. The remaining ~345 is NOT L05-owned: `near` mounts idx±1, so at L05 the frame includes I01 (~52 mesh nodes) + L04 (~118 — `street.v5.tsx` alone ~65) obstacles+dioramas, plus IslandBase/dressing/bridges/world shared by all three. Under-200 for the measured island total needs the same painted-merge pass in those files (ISL for L04/I01 + ART) — outside my ownership, flagged here, not touched.

Readability fix (same commit): laptops now flank the player's path in the front half at ~1.2× scale, screens turned toward the path; slab homes sit on the entry flanks over hue-tinted pads; hint pill restored via an `Html` portal — registry `hint` text until powered, then "Step aboard the lift"; hidden when the story card is open or once done.

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
