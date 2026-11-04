# RESULT — bridges (devin/bridges, port 5208)

## What Govinda saw
"Ropes going through islands." Numerically confirmed on all 10 bridges: the old
deck endpoints sat 4.2 m from each island centre while the grass lip runs to
~4.75–5.2 m, and the sine sag's steep end slope drove the last ~1 m of deck
up to **0.55 under the island surface** (and the rope rails with it) before the
endpoint — so both deck ends and ropes tunnelled through the rim lip.

## Changes (src/v5/world/Bridge5.tsx, src/v5/world/layout.ts)
- `exitWorld`/`entryWorld` now anchor the deck on the rim mouth at `BRIDGE_R = 4.9`
  on the local ±z path axis (keeps the gate/path/lantern alignment) — deck ends
  meet the island tops at the grass edge instead of inside it.
- Sag profile `sin(tπ)` → `sin²(tπ)`: flat tangent at both mouths, same 0.55
  mid-deck dip, so the deck no longer dives under the lip on approach.
- End posts now stand *inside* the mouth (pulled 0.42 m along the deck) and are
  clamped to ≤ 4.95 radial — on diagonal mouths the far post used to land past
  the grass edge; now every post sits on grass/rim, never in air or buried.
- Rope rails tie into the post tops (first/last CatmullRom points = post tops);
  rail offset widened 0.44 → 0.50 to sit just outside the plank edge.
- Lantern glasses now spot the real post tops (replaces `bridgeLampSpots`'s
  stale ±0.42 estimate).
- Walk strip `walk-bridge-*`: same 41×2 vertex-pair layout, widths, indexing,
  `walk-bridge-N` names. Extension past the ends 0.05 → 0.10 so tails still
  overlap the 4.85 walk discs (~4.48 radial reach), and tail tips taper
  ~0.025 under the disc top so spawns/rim walkers stay on the disc — the bridge
  guide grabs only at the rim, like before.

## Verified
- Numeric audit (all 10 bridges): deck clearance ≥ -0.03 vs island surface at
  the lip edge (plank rests on the edge, top flush); rope clearance ≥ +0.25;
  post radials 4.25–4.95 (all on grass).
- Screenshots of every bridge end: proofs/v7/bridges/fix/b*-{exit,entry}*.png
- tsc --noEmit: pass.
- play.mjs runs: (fill in)

## Still wrong / notes
