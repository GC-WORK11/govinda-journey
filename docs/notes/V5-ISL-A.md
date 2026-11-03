# ISL-A — L01 (tutorial) + L02 (rejections)

Status: obstacles implemented against core.ts, tsc-clean. Waiting on WORLD (?v5 route +
island group) for visual verification.

## What is built

- `src/levels/L01/shared.v5.tsx` — shared pieces: `useLocalPlayer` (island-local player pos),
  `tpLocal` + `sleep` + `useSolver` (QA), `Hint` (floating Inter canvas-sprite word, fades/bobs,
  no card), `PathStones`, `Gate` (stone pillars + swinging wooden double doors, invisible blocker
  panel while closed), `Rock` (blocker), `Mound` (walkable rise), `LowWall` (blocker + walkable
  top), `PaperLetter`.
- `src/levels/L01/campus.v5.tsx` — `CampusBlock` (cream block, terracotta hip roof, arched
  windows that warm, chimney smoke after solve), `BigTree`, `LaptopDesk` (laptop screen glows on
  use, stool, notebook, mug).
- `src/levels/L01/Obstacle.tsx` — courtyard: hop a low wall (blocker, sealed ends) → desk with
  laptop under tree (interactable `l01-laptop`, radius 1.7, label "sit at the laptop") → using it
  warms windows/lamps and swings the exit gate; complete() after the swing. Floating hints
  walk → hop → use, gated by progress flags. `done` renders everything open, no hints.
- `src/levels/L02/Obstacle.tsx` — stone ledge shelf (face z=-2.4, top y≈1.62) across the exit,
  closed gate on top. 5 letters (open / behind rocks / on a mound) picked up by walking into
  them (dist < 0.62); each flies a bezier arc, folds (tumble + shrink) and a stone step grows at
  the next slot (5 steps, rises 0.32 → 1.6). 5th landing opens the gate; stepping onto the ledge
  calls complete() → climb. `done` renders all steps + open gate, no letters.

## QA solvers

`window.__journey.solve.L01/.L02` merge into whatever WORLD/others put there (spread, not
replace). They teleport (player.pos ← localToWorld of local point) then use real interactions:
L01 calls `interactables.get('l01-laptop').use()`; L02 teleports onto each letter (real proximity
pickup) then onto the ledge. Registered only while the obstacle is mounted.

## Requests / assumptions for other areas

- PLAYER: blockers are assumed to be raycast meshes — my "invisible blocker" is a real box mesh
  with an opacity-0 material, so both raycast and bbox checks work. L01 wall top + L02 steps are
  walkable AND blocker. Jump must clear ~0.4 m (wall 0.36 + cap, steps 0.32 rise). If the
  controller supports step-up, 0.32 could instead be walked up — please keep it under ~0.3 so the
  hop still reads.
- PLAYER: `carryAnchor`/`player.carrying` not needed here (L02 letters fly to the steps, not
  carried). Not used.
- WORLD: `window.__journey.solve` may not exist yet — I create `{...existing}` defensively; please
  keep it an object map. Solver keys registered while mounted; a `solve(L01)` before the island
  mounts is a no-op (key absent).
- ART: all geometry is placeholder V4 clay (`src/world/kit` C + clay()). Please land
  `src/v5/art/Dressing.tsx` PROPS/`<Prop>` + toon material; then I swap: campus block → campus/college
  prop, gate → gate prop, tree → tree prop, letter → letter/mail prop, rock/steps/ledge → rock props.
- ART: an "envelope/letter" prop and a "stone step" prop for L02 would be ideal; the letter→step
  fold animation is already in place, only the meshes would change.
