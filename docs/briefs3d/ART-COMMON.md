# ART PASS — shared rules (read fully before touching code)

Repo: /workspace/govinda-journey (Vite + React 18 + R3F 8 + drei 9 + three 0.170, pnpm, TS). Dev server already runs at http://localhost:5190/ (do not start another). Read docs/AGENTS.md and docs/briefs3d/COMMON.md first.
Two other art agents work in this repo at the same time on different files. Stay inside your OWN file scope below; if you must touch a shared file, make a small, surgical edit.

## Restraint rule (the owner said "don't make things cringe")
- Richer and more polished, NOT busier or cuter. When in doubt, cut it.
- No confetti spam, no exclamation marks anywhere, no "Level complete", no cartoon/emoji-like icons, no winking mascots, no neon, no boxy cards, no debug text, no console logs.
- Effects subtle and brief. Warm clay palette, soft shadows, tilt-shift miniature look.

## Copy rule
- All visible project copy lives in ONE data file: src/levels/registry.ts. Never hard-code copy in components.
- Each project gets exactly one plain line (`line`, first person, short, true) and one sharp technical line (`tech`) built from verified facts already in the repo/registry/docs only. Never invent metrics, never name fellowship programs, never mention HUD or datavendors.
- Art agents do not rewrite copy unless your brief says so.

## Hard limits
- Keep initial load under 8 MB (check `du -sh dist` after build). Only CC0 assets; prefer procedural geometry. No new npm installs, no npx downloads.
- Keep the `?lite` weak-GPU path working (no heavy FX there).
- Disk is tight: run `df -h /` before any build; keep >1 GB free. Never delete other folders.
- Never kill chrome/node processes or tmux sessions you did not start. Never run `pkill`.
- Never print tokens/secrets.

## Checks (must pass before you commit)
1. `timeout 120 ./node_modules/.bin/tsc --noEmit -p .`
2. `node scripts/level-check.mjs <ID>` for each level you touched (it waits for a shared Chrome slot; be patient, do not bypass the lock). For world-wide changes run `node scripts/level-check.mjs L01`, `L05` and `L09`.
3. Look at the screenshots it writes in proofs/ yourself and judge them honestly against the rules above.

## Commit
- Commit only your own files: `git add <your paths>` then
  `git -c user.name="Govinda" -c user.email="govindasince2004@gmail.com" commit -m "art(<area>): <what>"`.
  If the index is locked, wait 10 s and retry. Do not push, do not deploy, do not rebase, do not reset.
- Commit after each passing chunk (small commits), so work survives interruptions.
- Write a short note of what you changed to docs/notes/ART-<AREA>.md, then exit.
