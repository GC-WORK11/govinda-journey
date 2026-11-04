# RESULT-char — Player character repair

## Diagnosis (from close-up probe shots)

Shot the existing model front/side/3-4/back + mid-stride + all clips frozen at
several phases (`/char-probe.html`, probe `src/v5/player/CharProbe.tsx`).

- **Rig is not broken.** Arms/hands skin correctly through idle, walk, jump,
  use, cheer — no mangled joints, no clip/rig mismatch. The GLB has 6 skinned
  parts sharing one 41-joint rig and one material.
- **The atlas retint was the real problem.** `student-skin.png` kept the
  original UV layout but repainted whole cells with poorly separated values:
  dark skin, near-black hair and black eyes all merged into one dark mass under
  ACES + scene light, and bright lime/yellow/magenta accent cells were left
  behind. Under the day/night lighting the character read as a black blob.
- The "gray spike" near the ear is the KayKit earring island collapsing onto a
  gray cell — not a skinning fault; after the repaint its texels sit inside the
  skin field so it disappears.
- Backpack is a separate chest-bone prop, does not intersect the arms; kept.

## Fix

- `tools/repaint-student.mjs` (new): extracts the embedded `rogue_texture`
  from `student.glb` (meshopt-decoded in Node), maps the rig's 64 px atlas
  cells by mesh part (rasterised UV coverage + vertex hits), and repaints each
  used cell with a semantic palette scaled by the original texel luminance so
  the baked shading/eyes survive:
  - skin `#a9713f` (face, ears, neck, hands)
  - hair `#241c16`, eyes `#160f0a`
  - cream shirt `#ede1cb` (tunic, sleeves, cuffs)
  - jeans `#4d6b8a` (trousers)
  - leather `#4a3423` (boots, belt, satchel strap)
- `public/models/student-skin.png` regenerated (~38 KB).
- `src/v5/player/Player.tsx`: material roughness 0.85 → 0.7 (kills the dull
  dark response under ACES), metalness stays 0; `Model` exported with optional
  `backpack`/`skinURL`/`freeze` for probe/QA use; clip map + HEIGHT + chest
  carry socket unchanged.
- `src/world/Traveller.tsx`: same texture + roughness 0.7 for V4 consistency.
- Probe tooling: `char-probe.html`, `char-tool.html`, `src/v5/player/CharProbe.tsx`,
  `src/v5/player/charTool.ts`, `scripts/v5/charuv.mjs`, `scripts/v5/charshots.mjs`
  (all shots inside one Chrome lock hold).

## Files changed

- `public/models/student-skin.png` (regenerated)
- `src/v5/player/Player.tsx`
- `src/world/Traveller.tsx`
- `tools/repaint-student.mjs` (new)
- `char-probe.html`, `char-tool.html`, `src/v5/player/CharProbe.tsx`,
  `src/v5/player/charTool.ts`, `scripts/v5/charuv.mjs`,
  `scripts/v5/charshots.mjs` (new, dev tooling)

## Verified

- `nice ./node_modules/.bin/tsc --noEmit -p .` — clean.
- `flock /tmp/gj-build.lock nice -n 15 ./node_modules/.bin/vite build --outDir /tmp/gj7-char-dist --emptyOutDir` — clean (~7 s).
- Close-up shots L01-day + L09-night: see `proofs/v7/char/`.
- `node scripts/v5/play.mjs ... --size=390 --lite --only=L01,L02` and
  `--size=1440` — results below.

## Still rough

- (fill in after visual review)
