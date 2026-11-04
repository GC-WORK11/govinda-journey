# RESULT-integrate — V7→main integration + preview deploy

## What changed (all squash-merged to main, ff-only)

| Branch | Landed |
|---|---|
| devin/char | Student atlas repaint (skin/hair/cream/jeans) + repaint tool + probes |
| devin/light | CharLight carried-lantern key light |
| devin/heli | Procedural CC0-style heli w/ spinning rotors, rider in bay |
| devin/clipA | L01–L03 interpenetration fixes + clipaudit.mjs |
| devin/clipB | I01 dup pond removed; L04 props off corridor + clip-audit.mjs |
| devin/clipC | clip-audit.mjs for I02/L06/L07 |
| devin/clipD | L08/L09 clipping fixes + audit harness; StaticBake ?nomerge |
| devin/bridges | Rim-anchored bridge mouths, tapered tips, sin² sag |
| devin/perfA | AutoMerge statics on all islands + NoMerge + shadow gating |
| devin/perfB | Cold-path split: lazy drei, deferred islands/sea/bridges, async fonts |
| devin/storyA | L01–L03 in-world story + taglines, FACTS additions |
| devin/storyB | I01, L05, L04 spoken story + taglines |
| devin/storyC | L06 Remote + I02 speech bubbles (+ width:max-content leftover) |
| devin/storyD | L07/L08 story+tagline, L08 board story, finale who-line |
| devin/copyqa | Copy/facts audit, tighter meta + intro |

Also committed gj7 leftovers to their branches first:
char (roughness 0.7 Traveller + RESULT-char), storyC (bubble width fix),
clipB (audit lock wait 35min).

Conflict resolution: AutoMerge wraps kept around clip/story content;
clip branches' position fixes kept inside the merged structure; heli's
BlockBox kept over storyC's; `Fence` (buried rim fence) stays deleted.
Full detail in docs/briefs8/INTEGRATED.md.

Dropped: `.devin-prompt.md` dupes, `vite.light.config.ts` (session-local).

## Verification

- `pnpm build` — PASS on the merged tree (and passed after each of the
  first 7 merges; remaining 8 verified in one build, conflicts resolved
  by hand + `tsc --noEmit` clean).
- `scripts/v5/play.mjs http://localhost:5301/ --size=1440 --lite` —
  BLOCKED by box environment, not code. Two separate issues found:
  1. **Shared `node_modules/.vite` cache collision** — every session's dev
     server fights over the dep cache → duplicate @react-three/fiber →
     "Hooks can only be used within the Canvas component" crash in Player.
     Fixed for this run: dev server on private cacheDir
     (`vite.integrate.config.ts`, kept uncommitted — session-local).
  2. **DISPLAY=:2 points at a dead X server.** Chrome 156 GPU process
     (SwANGLE) does `xcb_connect()` when DISPLAY is set → fails →
     `THREE.WebGLRenderer: A WebGL context could not be created
     (VENDOR=0xffff, DEVICE=0xffff)` → Canvas mount throws → boundary
     fallback → no canvas/walkables/solvers. Confirmed box-wide: char
     session's screenshot batch produced identical blanks the same window.
     WebGL worked at ~22:00 IST, died after. Workaround for any session:
     launch Chrome with DISPLAY unset (`env -u DISPLAY node …`) — verified
     via chrome error log; SwANGLE headless doesn't need X.
- `play.mjs` hard timeout bumped 25→55 min (lock queue on this box can eat
  half of it) — committed.
- Chrome time was repeatedly lost to lock races (`SingletonLock` held by a
  live foreign Chrome while the dir lock was free). Last state: play run
  queued with `env -u DISPLAY`; see "left" below.

## Deploy

- Preview (NOT production): https://govinda-journey-f5ubogfmp-govindasince2004-6895s-projects.vercel.app
- `● Ready`, built remotely 26s from main tip. Behind team Vercel SSO like
  previous previews.

## Left / caveats

- Full end-to-end playthrough still pending Chrome availability at write
  time; the environment fixes are in place (private vite cache +
  DISPLAY-unset launch + 55min budget). If the run lands clean it needs no
  code change; if not, first check for new console errors — the app boot
  itself is verified (domcontentloaded 90ms, __journey.v5 up, prog header
  renders).
- Other sessions should: `git rebase origin/main`, then run dev servers
  with a private `cacheDir` (see `vite.integrate.config.ts`) and launch
  Chrome with `env -u DISPLAY` until :2 is fixed or unset box-wide.
