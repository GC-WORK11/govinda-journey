# The Journey of Govinda — in-world 3D mini-game (READ FULLY)

Repo: /workspace/govinda-journey (Vite + React 18 + R3F 8 + drei 9 + three 0.170, TypeScript). Dev server already
running at http://localhost:5190/ (never start/stop it). Read docs/AGENTS.md "Disk rules" + "Shared box etiquette" first.

## The new direction (from the owner)
"Looks too complex and boxy. Make it a real interactive game, level by level, pixel-perfect 3D."
- NO 2D panels/sheets/DOM games. Your game happens IN the 3D world, on your island, with real 3D objects.
- ONE verb (tap OR drag OR hold). 10–20 seconds. A non-technical person understands it in 3 seconds.
- The ONLY on-screen text is the one hint line (already in src/levels/registry.ts `hint`, shown by the Overlay).
  Do not render any text in 3D unless it is a tiny, essential label. No numbers/scores/timers/captions.
- Instant juicy feedback on every action: bounce/squash, warm glow, leaf/sparkle burst, a soft blip sound.
- Look: warm matte clay miniature (cozy diorama). Rounded shapes (RoundedBox, capsules, spheres, lathe/extrude),
  soft colours from the island palette. Never neon, never cyberpunk, never flat boxes, no emoji, no console.log.
- Robust: never a broken state, works with mouse and touch at 1440x900 and 390x844 portrait. The object you
  interact with must be big enough to tap on a phone (≥ ~0.35 units across at the island's scale).

## The contract
Create/replace ONLY `src/levels/<ID>/Play.tsx` (plus optional helper files inside `src/levels/<ID>/`) and
`scripts/qa/<ID>.mjs`. You MAY edit your own `src/levels/<ID>/Diorama.tsx` if your game needs the scenery to
react (it gets `unlocked` and `active` props). Do NOT edit World.tsx, Overlay.tsx, store, registry, kit, play.tsx
(if you think the shared kit needs a fix, write it in your notes instead).

```tsx
import type { PlayProps } from '../types'      // { onWin: () => void; won: boolean }
export default function Play({ onWin, won }: PlayProps) { ... }
```
- Rendered INSIDE the R3F Canvas, inside your island's group: island-local coordinates. Island top surface y≈0
  (check `topY` in src/world/kit.tsx), radius 3.2. Your Diorama's building is near the centre; the traveller stands
  at (-0.9, 0, 1.4). The camera looks from +x,+y,+z (front-right, above). Free, well-framed play space is roughly
  x ∈ [-1.6, 2.2], z ∈ [-0.5, 2.4], y ∈ [0, 1.6]. Objects may float above the island.
- It mounts when the game starts (after the chapter title) and stays mounted during the ~2.6 s payoff (`won`=true)
  — use `won` to play a payoff (everything settles/glows/flies into place) and to disable input.
- Call onWin() exactly ONCE when solved. The world then: drops the scaffold, squash-bounces your building, fires a
  leaf burst + warm flare, shows the badge, then builds the bridge to the next island. Don't duplicate those.

## Shared kit: src/world/play.tsx (read it — use it)
`Draggable` (drag on a horizontal plane, onDrop(localPos) → true accepts, false springs home, `to` snaps it),
`Tappable` (hover lift + squash on tap), `useHoldAnywhere()` (press-and-hold anywhere / Space),
`burst(worldPos, color, n, power)`, `Pop` (squash-stretch appear), `Bob` (float), `blip(step)`, `chime()`,
`glowMat(color, base)` + `pulse(mat, on, t, dt)`, `springStep`, `REDUCED` (prefers-reduced-motion: tone down).
Clay materials: `clay(hex)` and the palette `C` from src/world/kit.tsx. drei has RoundedBox, Sparkles, Float etc.
Use island-local → world via a group ref: `ref.current.localToWorld(new THREE.Vector3(x,y,z))` for burst().
Give a hint of affordance: the thing to touch gently bobs/glows until touched; targets/slots glow softly.

## Assets
Primitives done well are fine. CC0 GLBs (Kenney/KayKit/Quaternius on GitHub raw URLs) are allowed if they clearly
look better: download with curl to /tmp, compress with node /tmp/gjt/prune.mjs-style gltf-transform (already
installed in /tmp/gjt; see that script) to < 150 KB, put in public/models/<id>-*.glb, load with
useGLTF('./models/<file>.glb'). No npm installs, no npx downloads. Initial total load must stay small.

## QA (mandatory)
`scripts/qa/<ID>.mjs` exports `default async function (page)` that WINS your game through real pointer input on
the canvas. Locate 3D points with `await page.evaluate((p) => window.__journey.project(...p), [x,y,z])`
(island-local → CSS px) or `window.__journey.find('<object name>')` (set `name=` on your groups). Then
`page.mouse.move/down/up/click` (drag: down, several moves, up; hold: down, wait, up). Works on the mobile
viewport too. Run `node scripts/level-check.mjs <ID>` (it waits for the shared Chrome lock) at most THREE times
total; it must print PASS (WON at both sizes, 0 console problems). Look at proofs/<ID>-desktop-game.png,
-mobile-game.png, -after.png with your image viewer/reader and judge them honestly: is it obvious what to do?
does it look premium? Fix and re-run if not. Typecheck: `npx tsc --noEmit -p .` (local, no download).

## Finish
Write docs/notes/<ID>-3d.md (≤ 15 lines: the game, the verb, files, anything rough). Then stop. Never run git.
Never run pkill/kill. Keep your turns economical.

## YOUR LEVEL: L09 — 'Chalk' (finale: a messaging app for Indian schools, still being built). Hint shown: 'Tap the right answer'.
Read src/levels/L09/Diorama.tsx first. Game (TAP): the school gate is closed; a clay chalkboard stands before it
with one very simple question drawn in chalk (drei Text in a chalk-white, e.g. '3 + 4' ) and three chunky chalk
pebbles with answers (6, 7, 8) floating below. Tap the right one → chalk tick draws on the board, the bell on the
gate swings with a ding, gates swing open with a squash, burst → chime → onWin(). Wrong one: gentle wobble, chalk
dust puff, stays. Should feel like a warm, celebratory end.


## POLISH PASS (you are taking over)
A previous agent wrote src/levels/L09/Play.tsx (read docs/notes/L09-3d.md). In proofs/L09-desktop-game.png the chalkboard and the 6/7/8 pebbles are far too small and tucked against the building. Make the board ~2.5x bigger and stand it in the open front play space facing the camera (front-right, above), with three big, chunky clay pebbles (≥0.45 units) floating in a row in front of it, gently bobbing. Wrong pebble: soft wobble + springs back, no penalty text. Right pebble: flies onto the board, chalk tick, gate opens, chime, onWin(). This island is at NIGHT: give the board and pebbles a gentle warm self-glow / small warm point light so they read in the dark (no neon). Must read at 390x844. Max 3 level-check runs.
