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

## YOUR LEVEL: I02 — 'On the road' (trains across India, interlude). Hint shown: 'Hold to drive the train'.
Read src/levels/I02/Diorama.tsx first. Game (HOLD, useHoldAnywhere()): a toy clay train (engine + 2 carriages,
terracotta/cream/teal-grey, round windows, a little chimney puffing) on a looped track around the island's front.
Hold → the train accelerates smoothly (puffs faster, wheels spin, tiny camera-free sway); release → it coasts to a
stop. One lap (or reaching the small station platform) with a stop at the station → little clay passengers pop up
waving, a whistle blip → chime → onWin(). Must be readable without text: a glowing station flag marks the goal.


## FIX PASS (you are taking over)
A previous agent wrote src/levels/I02/Play.tsx (read it and docs/notes/I02-3d.md) but in proofs/I02-desktop-game.png the train is NOT visible: there is no drawn track, the loop radius 2.4 puts the train behind the central building/trees, and the passengers are placed in island coords instead of at the station. Rewrite so: a visible clay track (two rails + sleepers, or a rounded ballast ring) runs as an oval through the open FRONT play space (e.g. centre (0.6,0,1.3), radii ~1.5 x 0.9, staying clear of the traveller at (-0.9,1.4)); the train is big and readable from the camera (front-right above) at both 1440x900 and 390x844; the glowing station flag/platform sits on the front of the oval; one lap ending at the station wins; passengers pop at the platform. Keep wheels as rounded cylinders (no flat boxes). Max 3 level-check runs; QA must win via real hold input.
