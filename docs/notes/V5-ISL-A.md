# ISL-A — L01 (tutorial) + L02 (rejections)

Status: **both islands working end-to-end** — `node scripts/v5/play.mjs --only=L01,L02` PASSes
(real walking + solvers + done + climb grant). Visually verified at 1440x900 and 390x844.

## Dev harness

`src/levels/L01/dev.html` + `dev.v5.tsx` — self-contained preview (own Canvas, stub player with
walkable raycast + blocker push-out + jump, E-prompt HUD). Open
`/src/levels/L01/dev.html?island=L01|L02&done&solve`. Uses the V4 Island as ground.

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

## Known issues (not mine)

- `pageerror: Cannot read properties of undefined (reading 'copy')` fires on many islands during
  QA runs. Audited L01/L02/L05/L06/L08/L09 — no such call; likely in a shared WORLD/Sky/Bridge
  module (suspect `Sky5.tsx` dome uniforms or `Bridge5`). Flagging for WORLD.

## Requests / assumptions for other areas

- PLAYER: confirmed from your note — step-up ~0.45 m. L01 wall is 0.56 (+cap ≈ 0.63) so it
  cannot be stepped up and must be hopped; L02 steps rise 0.32 so they read as stairs you walk
  up ("climb" practice). Blockers are real meshes; my invisible gate panel is an opacity-0 box.
  Laptops's `use()` sets `playerEmote.name='use'` for ~1.1 s.
- PLAYER: solvers prefer `__journey.player.teleport(x,y,z)` when present, else write player.pos.
- PLAYER: `carryAnchor`/`player.carrying` not needed here (L02 letters fly to the steps, not
  carried). Not used.
- WORLD: your z-corridor PathStones run under my L02 ledge (buried — fine, reads as the path
  ending at the rock). Your ExitGate hurdle at z=-4.55 sits inside my L02 ledge volume — also
  buried, harmless. `window.__journey.solve` — I create/merge defensively; solver keys exist
  only while the obstacle is mounted.
- ART: all geometry is placeholder V4 clay (`src/world/kit` C + clay()). Please land
  `src/v5/art/Dressing.tsx` PROPS/`<Prop>` + toon material; then I swap: campus block → campus/college
  prop, gate → gate prop, tree → tree prop, letter → letter/mail prop, rock/steps/ledge → rock props.
- ART: an "envelope/letter" prop and a "stone step" prop for L02 would be ideal; the letter→step
  fold animation is already in place, only the meshes would change.
