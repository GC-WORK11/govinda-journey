# V5-QA — headless playthrough harness

Owner: QA. Files: `scripts/v5/**`, this note. I do not edit game code.

## Harness
`scripts/v5/play.mjs` — one shared headless Chrome (profile `/tmp/gj-chrome-profile`,
`/tmp/gj-chrome.lock` dir lock, heartbeat while held). Opens `/?qa` (falls back to `/?v5&qa`),
clears `localStorage.govinda-journey-v5` + `useV5.reset()`, then for each island in V5_ORDER:

1. walks with **real inputs** from ENTRY toward the obstacle — WASD probing on desktop
   (key whose burst closes distance is held, re-probed on stall), virtual-joystick
   touch probing on mobile (390×844),
2. calls `window.__journey.solve[ID]()` when present; otherwise walks to each enabled
   `core.interactables` entry and uses it for real (E / Enter / use-button tap),
3. asserts `useV5.done` includes ID and the `GRANTS` ability was granted,
4. walks across the bridge to the next island (verifies `player.island` flips),
5. screenshots `proofs/v5/<size>-<n>-<ID>.png`; writes `proofs/v5/last-run.json`.

FAIL lines are printed and the run continues (recovery teleports to the next ENTRY via
`__journey.v5.goto` → `player.pos` write, so a broken island does not mask later ones).

Read live game state by importing `/src/v5/core.ts` + `/src/v5/world/layout.ts` inside the
page (same module instances the app uses): `player.pos`, `useV5`, `walkables`,
`interactables`, `ISLAND_POS` — no reliance on QA hooks existing.

Usage: `node scripts/v5/play.mjs [baseUrl] [--lite] [--only=L01,L02] [--size=1440|390]`

## Status
- Harness written and syntax-checked. Run loop: every ~15 min once V5 mounts.

## Run log

### Run 1 (~18:50) — BOOT FAIL (expected: V5 not mounted yet)
- `/?qa` and `/?v5&qa` both render V4 (App.tsx not routed). Detection OK, 75 s to give up.
- proof: `proofs/v5/1440-00-nov5.png` shows the V4 world.

### Bugs filed (blocking `tsc --noEmit`, all outside my area)
- **ISL-C L05**: `src/levels/L05/parts.v5.tsx` — `RefObject<Object3D>` passed to `<mesh>`/`<group>`
  refs (lines ~70,114,115,157,182,189,232,259,261,280). Type them `useRef<THREE.Mesh>(null)` /
  `useRef<THREE.Group>(null)`.
- **ISL-E L06**: `src/levels/L06/Obstacle.tsx:186` — `Vector3` passed where `Color` is expected.
- **ISL-F L08**: `signui.v5.tsx:241` condition always true (call the fn?); `v5kit.v5.tsx:44`
  expected 2 args, got 1.
- **WORLD**: `src/v5/world/modules.ts` — `import.meta.glob` untyped; needs
  `/// <reference types="vite/client" />` or `"types": ["vite/client"]` in tsconfig.

## Requests to other areas
- WORLD: brief mentions `__journey.v5.goto(id)` — please accept the island id string
  (`'L05'`), that is what the harness passes.
- WORLD/PLAYER: `player.pos` write is used as the QA teleport fallback — keep it writable
  (PLAYER already has `__journey.player.teleport` planned; either works).
- ISL-*: `__journey.solve.<ID>` should be **async** and must work after a forced reset when
  the player stands at island ENTRY; please leave `player.frozen` false when done.
