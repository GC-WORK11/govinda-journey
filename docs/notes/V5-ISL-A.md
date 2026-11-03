# ISL-A — L01 (tutorial) + L02 (rejections)

Status: **both islands working end-to-end** — `node scripts/v5/play.mjs --only=L01,L02` PASSes
(real walking + solvers + done + climb grant). Visually verified at 1440x900 and 390x844.

## Dev harness

`src/levels/L01/dev.html` + `dev.v5.tsx` — self-contained preview (own Canvas, stub player with
walkable raycast + blocker push-out + jump, E-prompt HUD). Open
`/src/levels/L01/dev.html?island=L01|L02&done&solve`. Uses the V4 Island as ground.

## What is built

- `src/levels/L01/shared.v5.tsx` — shared pieces: `useLocalPlayer` (island-local player pos),
  `tpLocal` + `sleep` + `useSolver` (QA), `PillHint` (DOM cream pill at the bottom, Inter,
  V4-style — replaces the old floating sprite words), `PathStones` (pack stones), `Gate`
  (stone pillars + swinging wooden double doors, invisible blocker panel while closed),
  `Rock` (pack prop + opacity-0 collider box), `Mound` (walkable rise), `LowWall`
  (blocker + walkable top), `PaperLetter`.
- `src/levels/L01/campus.v5.tsx` — `CampusBlock` (KayKit `building_a` on a clay plinth, porch
  light + chimney smoke warm up after solve), `BigTree` (`tree_oak` + trunk collider),
  `LaptopDesk` (`desk` + `laptop` + `chair_desk` + `books`, mug; screen + desk light warm on use).
- `src/levels/L01/Obstacle.tsx` — courtyard: hop a low wall (blocker, sealed ends) → desk with
  laptop under tree (interactable `l01-laptop`, radius 1.7, label "sit at the laptop") → using it
  warms windows/lamps and swings the exit gate; complete() after the swing. Bottom pill chain:
  WASD/stick → jump the wall → sit at the laptop. `done` renders everything open, no pill.
- `src/levels/L02/Obstacle.tsx` — stone ledge shelf (face z=-2.4, top y≈1.62) across the exit,
  closed gate on top. 5 letters (open / behind quat rocks / on a mound) picked up by walking into
  them (dist < 0.62); each flies a bezier arc, folds (tumble + shrink) and a stone tooth with a
  flat stone cap grows at the next slot (5 steps, rises 0.32 → 1.6). 5th landing opens the gate;
  stepping onto the ledge calls complete() → climb. `done` renders all steps + open gate, no
  letters. Pill: "Pick up the five letters" → "N of 5 letters" → "Climb the stone steps".

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

- **WORLD — the V4 parity Diorama overlaps the obstacles.** `Island5` mounts the V4
  Diorama (scaled 5/3.2) under every Obstacle, and while unsolved each diorama is
  covered by a big `Scaffold` dome. Verified live on `?v5&at=L01&fresh`:
  - L01's dome covers the courtyard's back half (x −1.3…2.4, z −2.4…0.2): my gate at
    z=−3.9 is hidden behind it until solve (acceptable — dome lift IS the payoff),
    but the desk only just clears its skirt — I moved desk/tree right to (2.35,−0.6)/
    (2.9,−1.45).
  - L02's dome (x −1.56…1.56, z −2.2…−0.3) sat exactly over the step run and one
    letter — I moved the run to the ledge's right flank (x≈2.1) and the letter to
    (−2.9,−1.5). V4's decorative fake letters also linger on the field looking like
    pickup targets (only real ones fly — flagging as known confusion).
  - Recommend: `Island5` skips the Diorama when `hasObstacle(id)` (or a per-island
    opt-out), at least the `Scaffold` wrap — the parity baseline's job is done once
    an island's obstacle is live.


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
- ART: props swapped in — `building_a`, `tree_oak`, `desk`, `laptop`, `chair_desk`, `books`,
  `streetlight`, `fence_planks`/`fence_simple`, `plant_bush*`, `rock_small_*`, `quat_rock_*`,
  `path_stone`, `rock_path_round`, `stone_small_flat_a` (step caps), `<Scatter>` tuft/flower rims.
  Still clay by design: gate (animated doors), low wall, ledge shelf, mound, letters (no envelope
  prop exists — could swap if ART adds one), step teeth (need exact collider heights).
