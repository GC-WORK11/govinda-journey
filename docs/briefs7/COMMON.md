# Common rules for every Devin session (V7 sprint, Nov 4 2026)

Project: "The Journey of Govinda" — browser 3D portfolio game (Vite 5, React 18, R3F, drei, three 0.170, zustand, TS).
You are in your OWN git worktree (cwd) on your OWN branch `devin/<name>`. Read docs/AGENTS.md, docs/V6.md, docs/FACTS.md first.
Level order: L01 L02 L03 I01 L05 L04 I02 L06 L07 L08 L09. Per-level code in src/levels/<ID>/ (V5/V6 path uses *.v5.tsx + Obstacle.tsx + Diorama.tsx). Shared world in src/v5/.

HARD DEADLINE: commit + `git push origin HEAD:devin/<name>` early and often (at least every 30 min). FINAL push by 14:15 IST. Work after 14:15 is lost.
Write a short `docs/briefs7/RESULT-<name>.md` (what changed, files, how verified, what is still wrong) and push it with your final commit.

Box rules (shared machine, 8 cores, ~4 GB free RAM, ~1.3 GB free disk — be frugal):
- Only touch files inside your worktree. NEVER edit /workspace/govinda-journey (main checkout) or other worktrees. Never push to main. Never force-push.
- Never kill processes you did not start; never `pkill`/`killall`; kill only by your own PID. Never touch tmux sessions you did not create.
- Builds: `flock /tmp/gj-build.lock nice -n 15 ./node_modules/.bin/vite build --outDir /tmp/gj7-<name>-dist --emptyOutDir` then `rm -rf /tmp/gj7-<name>-dist` when done. Typecheck: `nice ./node_modules/.bin/tsc --noEmit -p .`.
- Dev server (only if needed): your assigned port only, `--strictPort`, stop it by PID when done.
- Chrome/screenshots: ONLY through scripts/chrome.mjs `withChrome` (it takes /tmp/gj-chrome.lock; one browser on the box). Keep each browser use under 3 minutes. Useful: `WAIT=14000 node scripts/livecheck.mjs jobs.tsv` (lines `out.png<TAB>url<TAB>1440x900|390x844`), URL form `http://localhost:<port>/?qa&fresh&at=<ID>&unlock` (add `&lite` for mobile). Playthroughs: `node scripts/v5/play.mjs http://localhost:<port>/ --size=1440 --only=L04` (PASS/FAIL lines). Save images under proofs/v7/<name>/ (gitignored is fine) and keep them small.
- Disk: no new big files. Assets must be CC0 and small (<1.5 MB each, prefer glb <500 KB); record source + license in public/models/packs/LICENSES.md. No npm installs into the repo unless essential (node_modules is a shared symlink — do NOT run npm install in the worktree; if you need a tool, install it under /tmp/gj7-<name>-tools and delete it after).
- Never print secrets. No posting/emails. No production deploys (no vercel).

Design rules: no neon, cyberpunk, confetti, exclamation marks, "Level complete", emoji or boxy text panels. Fonts Fraunces + Inter. Copy must be sourced from docs/FACTS.md (no invented numbers or claims). Never mention HUD/datavendors (NDA), Mergetober, or fellowship program names. Must work on mobile (390 `?lite`) and desktop 1440. Keep draw calls low; never regress perf. Gameplay must stay passable: run the play.mjs playthrough for any level you touch before final push.
