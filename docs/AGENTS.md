# Rules for every agent working on The Journey of Govinda

You are one of ~13 agents building this in parallel, in ONE shared working tree: /workspace/govinda-journey.
Deadline: tonight. Work fast, verify, stop.

## What this is
A playable 3D portfolio for Govinda Chauhan (21, IIT Patna BS). One linear path of floating clay islands.
The traveller walks bridge to bridge. At each island the visitor plays a short mini-game (20-60 s) that shows
the real technical idea of that project in a way a non-technical person can play. Winning drops the scaffold
off the building, gives a badge and opens the project story. Read src/levels/registry.ts for all copy.

## Look (non-negotiable)
- Cozy, hand-crafted tilt-shift clay miniature: matte, rounded, warm cream / terracotta / leaf green, soft daylight.
  References: docs/refs/town.jpg (primary), docs/refs/islands.jpg. Use the palette `C` and `clay()` in src/world/kit.tsx.
- BANNED: neon, cyberpunk, glow-on-black, gradients that scream "AI", boxy cards, navbars, generic star or circle
  icons, emoji, icon libraries, visible debug text, console.log, marketing copy, words like "AI-powered", "revolutionary",
  "seamless", exclamation marks. No lorem ipsum. Don't invent numbers or facts; only use what is in registry.ts.
- Type: Fraunces (serif, titles) + Inter (UI). Small text in var(--ink2). Buttons use class `btn` (ink pill) or `link`.
- Mini-game UIs are drawn with SVG / CSS / canvas inside the game sheet (or a small R3F <Canvas> if you really need 3D),
  in the same clay palette: soft rounded shapes, gentle shadows, paper textures. They must feel like a toy, not a form.
- Must work with mouse AND touch (pointer events), at 390x844 and 1440x900. No hover-only interactions. No keyboard-only.
- Respect prefers-reduced-motion. Keep each level's code small and dependency-free (no new npm packages
  unless your brief says so; ask the coordinator by writing to docs/notes/<your-id>.md instead).

## Contracts
- Your files only: the folder(s) your brief names. Do not edit other folders, registry.ts, Overlay.tsx, store.ts,
  package.json or the lockfile unless your brief says you own them. Need a change elsewhere? Write it in
  docs/notes/<your-id>.md and continue.
- `Game.tsx` default export: `({ onWin }: GameProps) => JSX`. Call `onWin()` exactly once on success. Never lose
  state mid-game. Give gentle feedback for wrong moves, never a fail screen. Always winnable within 60 s.
  Include a tiny first-time hint inside the game (one short line, plain words).
- `Diorama.tsx` default export: `({ unlocked, active }: DioramaProps) => <group>` rendered at the island centre
  (island top is y = 0, radius 3.2; keep props inside radius 2.4, leave the front-left area around x=-0.9, z=1.4 free
  for the traveller). Wrap the main building with `<Scaffold open={unlocked} .../>` from src/world/kit.tsx (or your own
  nicer cover). After unlock add a little life (smoke, a light, a moving part). Under ~60 meshes; reuse geometries;
  castShadow on solid props. No external model files unless tiny (<150 KB) and placed in public/models/<your-id>/.
- Add `data-qa` attributes to the interactive elements of your game and write `scripts/qa/<LEVELID>.mjs` exporting
  `export default async function play(page) {}` that WINS your game in puppeteer by real clicks/drags/typing
  (no calling onWin directly). The page is already at `/?qa&lite&at=<LEVELID>&play`.

## How to check your work
- A dev server runs at http://localhost:5190 (shared, HMR). Do NOT start another dev server or run `pnpm build`
  (the box is short on CPU/disk). Do NOT run pnpm install.
- Type check: `cd /workspace/govinda-journey && npx tsc -p . --noEmit` must pass (fix only errors in your files).
- Open your level directly: http://localhost:5190/?qa&lite&at=<LEVELID>&play  (game)   or `&at=<LEVELID>` (island).
- Screenshot + run your QA script: `node scripts/level-check.mjs <LEVELID>` -> writes proofs/<LEVELID>-*.png and
  prints whether your scripts/qa script won the level and any console errors. Look at the PNGs yourself and judge
  them honestly against the look rules. Iterate until it looks hand-made and premium. Max ~6 screenshot rounds.
- Do NOT run git commands. The coordinator commits.
- When done, write docs/notes/<LEVELID>.md: what the mini-game is (2 lines), what you verified, anything rough.

## Shared box etiquette (added by coordinator)
- Headless Chrome is serialized: scripts/level-check.mjs waits for a shared slot ("waiting for the shared browser slot…"). That is normal; just wait. Do NOT write your own puppeteer scripts or launch Chrome directly — use level-check.mjs only, and at most once or twice per agent.
- Run `npx tsc -p . --noEmit` at most a few times; filter output for your folder.
