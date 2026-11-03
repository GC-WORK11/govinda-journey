# ART-ISLANDS notes

- `kit.tsx`: underside is now a stepped strata lathe (banded sedimentary colours, AO under the
  lip + toward the tip) instead of a plain cone; grass rim gets a low-freq radial wobble so the
  silhouette isn't a perfect circle. `scatterGeo` got denser (trees→5, pebbles→10, tufts→26,
  flowers→13, plus rim blades leaning over the lip and the odd trunk mushroom) — all still ONE
  merged vertex-coloured mesh per island, so draw calls don't grow.
- New shared props in kit.tsx: `Fence` (merged posts+rails), `LampPost`, `ClayPot`, `Bush`, `Letter`.
- Story props per island: L01 back-rim fence+shrubs; L02 letters kept by/under the closed gate;
  I01 stone lantern, bank pebbles, extra reeds; L03 workbench + small easel (hidden while `active`
  so the game's own easel owns the front); L04 street lamps, low brick wall, pots (Delhi street);
  L05 mugs, note, floor cushion; I02 platform luggage, lamp, milk churn; L06 roof dish, door pots,
  fenced corner; L07 desk→tower cable, notes, mug; L08 clay crate, tools, back fence; L09 gate
  pots, satchel, corner shrubs. All placed clear of stand (-0.9,0,1.4), bridge landings and every
  Play drag/tap zone (checked against each Play's coordinates).
- Verified: `tsc --noEmit -p .` clean; `level-check L01` PASS (WON desktop+mobile, 0 console
  problems) before the V4 cutoff; L05/L09 runs were queued on the shared Chrome slot when stopped.
