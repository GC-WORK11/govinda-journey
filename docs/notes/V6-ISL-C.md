# V6-ISL-C — L05 Ent compute yard

What: same carry-slabs-to-matching-laptops challenge, re-dressed as a compute yard — server rack with ember LEDs, crate stack and warm work light beside the lift, four laptop screens glowing warm from idle (ember → share hue on dock). Story lectern east of the entry path opens a paper card (`card.v5.tsx`) with line + tech + real Ent/Paper links from registry.
Status: committed c6d3f34, tsc clean; code-reviewed (colliders invisible, placements clear of corridor/laptops/lift/gap). NOT yet run in-browser (Chrome runs banned — box saturated).

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
