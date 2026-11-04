# RESULT storyB (V8 final sprint)

Scope: L06 Remote, L07 Wispr Wrap, L08 Sign-Flow, L09 finale island, I02 On the road, and the finale end card. Branch `devin8/storyB`.

## What changed (on top of origin/main b16179d)

- Captions for L06 to L09 and I02 now use `docs/briefs8/VOICE_LINES.md` verbatim, as the brief asks, with two deliberate exceptions:
  - L08: "learns my own hand signs" became "takes my own hand signs". FACTS (S6) describes matching, not learning, and removed "learns" for that reason.
  - Typographic apostrophes, to match the rest of `registry.ts`.
- `src/levels/registry.ts`, only the nine changed lines in the L06 to L09 and I02 blocks:
  - L06 `line` (VOICE_LINES) and `tech`: "A zero-dependency C++20 daemon on the laptop, an Expo app on the phone. Prompts go out; text, screenshots and approvals stream back."
  - L07 `line` (VOICE_LINES).
  - L08 `line` (VOICE_LINES, with "takes") and `tech`: "Only 21 points of your hand go to the laptop, where each sign is matched against your three takes."
  - L09 `line` (VOICE_LINES) and `tech`: "Every project island you crossed links to its repo or a live demo."
  - I02 `line` (VOICE_LINES).
- Finale: a small credit line at the foot of the end card, "Built with voice via Wispr Flow + vibe-coding tools", in `src/v5/ui/Finale.tsx` and `src/v5/ui/v5.css`. No Emergent claim.
- Kept from origin/main (V7 storyC/storyD, reviewed, not changed): all `story` fields, the L07 badge "Dictated", the L08 badge "Hand signs", and the finale who-line and stack.

Merge note: origin/main moved while this branch was in progress. I merged origin/main instead of rebasing, because rebasing would have needed a force-push of `devin8/storyB`, which is not allowed. The registry conflict was resolved by taking origin/main's file and reapplying only the nine lines above.

## Verified how

- `pnpm build` (`tsc -b && vite build`) on the merge commit.
- Every number is sourced:
  - "0.3 milliseconds" (L06): `docs/BENCHMARKS.md` in the Remote repo, "click | 0.3 | 0.6" (p50 / p95, measured on the rig).
  - "a tenth of a second" and "21 points" (L08): FACTS L08 rows (S6). The README gives a median of 107 ms from finished sign to first key.
  - "no Wispr Flow for Linux" (L07): S7 README, quoted in the FACTS L07 row.
  - "zero-dependency C++20 daemon, Expo app" (L06): FACTS L06 rows (S5).
  - "Every project island ... links to its repo or a live demo" (L09): FACTS L09 row; every project island has a GitHub or live link in the registry.
- The dev server on port 5307 served the edited modules with the new strings.

## Playtest status

Not completed. The shared box was overloaded (load average 80 to 140 around 18:30), and the shared Chrome slot was contended all evening. Per log in `proofs/storyB-play-*.log` (gitignored):

- First 1440, 390 and visitor runs: harness protocol timeouts, a renderer death at L06 at 390, and an `Input.dispatchKeyEvent` timeout on the visitor boot.
- Later 1440 attempts: one reached boot and failed with `V5 world not mounted` (cause not determined; the script logged no console error). Others timed out on the shared lock, held by another session's `/tmp/pace-probe2.mjs`.
- Last attempts: `SingletonLock` collisions with a Chrome on the same profile that did not hold the script lock.

So no run finished. The first 390 run booted and reached L06 before the renderer died. L06 to L09 and I02 play, the finale card, and the captions are not verified in a browser. A rerun is still needed: `node scripts/v5/play.mjs <url> --only=L06,L07,L08,L09,I02` at 390 and 1440, plus `--visitor`.

## What's left and flags

- Remote numbers conflict inside the repo. The Remote README says "click ~11 ms"; `docs/BENCHMARKS.md` says p50 0.3 ms. The VOICE line uses 0.3 ms, which matches BENCHMARKS.md. Govinda should confirm which figure he wants on screen. I did not change it.
- The I02 line ("Between builds, I'm usually on a train to a new city.") is Govinda's own script from VOICE_LINES, not a sourced fact. He should confirm it.
- `docs/FACTS.md` audits the older copy. The new VOICE_LINES sentences have no rows yet. The FACTS owner should re-audit. I did not edit FACTS.md, since it is outside this session's files.
- `story` for L06 to L08 renders only in the v4 overlay (`?v4`). In V5 the visible copy is `line` on arrival, `tech` for 6 s after the win, the finale list, and the L08 board.
- FACTS has no number for Remote's own features or for Wispr Wrap. The 0.3 ms click comes from `docs/BENCHMARKS.md`, not FACTS, so FACTS needs a row for it. I did not invent any other number.
- `docs/AGENTS.md` describes the older 13-agent setup (`/workspace/govinda-journey`, port 5190, no git commits by agents). I followed `docs/briefs8/COMMON.md` for git, ports, build, and merge, and used `AGENTS.md` for the look and copy rules.
- `tsconfig.tsbuildinfo` is tracked and changes on every `tsc -b`. It was restored and not committed.
