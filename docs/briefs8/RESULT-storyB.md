# RESULT storyB (V8 final sprint)

Scope: project story for L06 (Remote), L07 (Wispr Wrap), L08 (Sign-Flow), L09 (finale island), I02 (On the road), and the finale end card. Branch `devin8/storyB`.

## What changed

Commit `f571b89` (copy and credit only):

- `src/levels/registry.ts`, only the L06 to L09 blocks:
  - L06 Remote `tech`: "A zero-dependency C++20 daemon on the laptop, an Expo app on the phone. Prompts go out; text, screenshots and approvals stream back."
  - L07 Wispr Wrap `line`: "There is no Wispr Flow for Linux, so my phone became the mic."
  - L07 Wispr Wrap `tech`: "Dictate on your phone with Wispr Flow. A small service on the laptop types the text into whatever window has focus."
  - L07 badge: "No keys" changed to "Phone mic". The daemon uses a pairing key (`~/.config/wf/key`, `X-WF-Key`), so "No keys" was misleading.
  - L08 Sign-Flow `tech`: "Only 21 points of your hand go to the laptop, where each sign is matched against your three takes."
  - L09 `tech` (caption after the last island): "Every project island you crossed links to its repo or a live demo."
- `src/v5/ui/Finale.tsx` and `src/v5/ui/v5.css`: a small credit line at the foot of the end card, "Built with voice via Wispr Flow + vibe-coding tools". No Emergent claim.

Unchanged on purpose: I02 copy (its line is already audited, S1), the L06 and L08 `line` (arrival captions, already audited), and all `story` fields (see flags).

## Verified how

- Every new sentence maps to a row in `docs/FACTS.md` and to the README it cites. I re-read the raw READMEs of Remote, Wispr Wrap and Sign-Flow before writing.
  - Remote (S5): zero-dep C++20 daemon, Expo app, text, screenshots and approvals stream back.
  - Wispr Wrap (S7): "there is no Wispr Flow for Linux, so the phone becomes the mic"; dictate with Wispr Flow; types into any focused app.
  - Sign-Flow (S6): "Only 21 landmark points per hand go to the laptop"; three takes; each sign is matched against the takes you recorded.
  - Finale: "Each project island links to its repo or a live demo" (FACTS L09 row). Checked against the registry links: every project island has a GitHub or live link.
- `pnpm build` (`tsc -b && vite build`) passes on the rebased branch.
- The dev server on port 5307 serves the edited modules with the new strings (`Finale.tsx` credit line, `registry.ts` copy).
- Playtest: see status below.

## Playtest status

Not completed. The shared box was overloaded (load average 80 to 140 around 18:30), and the shared Chrome slot was contended all evening. Per log in `proofs/storyB-play-*.log` (gitignored):

- First 1440, 390 and visitor runs: harness protocol timeouts, a renderer death at L06 at 390, and an `Input.dispatchKeyEvent` timeout on the visitor boot.
- Later 1440 attempts: one reached boot and failed with `V5 world not mounted` (cause not determined; the script logged no console error). Others timed out on the lock held by another session's `/tmp/pace-probe2.mjs`.
- Last attempts: `SingletonLock` collisions with a Chrome on the same profile that did not hold the script lock.

So no run finished. The first 390 run booted and reached L06 before the renderer died. Level-by-level play (L06 to L09, I02), the finale card and the captions are not verified in a browser. Verified instead: `pnpm build`, the modules served on port 5307, and every new sentence against FACTS and the READMEs. The rerun is still needed: `node scripts/v5/play.mjs <url> --only=L06,L07,L08,L09,I02` at 390 and 1440, plus `--visitor`.

## What's left and flags

- `docs/FACTS.md` still audits the old text. The line references for L06 to L09 have moved, and the new sentences have no rows of their own. The FACTS owner should re-audit. I did not edit `docs/FACTS.md`, since it is outside this session's files.
- `story` for L06 to L08 renders only in the v4 overlay (`?v4`). In V5 the visible copy is `line` on arrival, `tech` for 6 s after the win, the finale list, and the L08 board. So the "why" for Sign-Flow ("Built for the #NoHandsChallenge") is not visible in V5. Showing it would take a small in-world change to the L08 board, which I did not make.
- FACTS has no impressive number for Remote or Wispr Wrap, so their lines carry none. I did not invent one. The Remote README's benchmark figure (click ~11 ms) is not in FACTS and was not used.
- `docs/AGENTS.md` describes the older 13-agent setup (`/workspace/govinda-journey`, port 5190, no git commits by agents). I followed `docs/briefs8/COMMON.md` for git, ports, build, and merge, and used `AGENTS.md` for the look and copy rules.
- `tsconfig.tsbuildinfo` is tracked and changes on every `tsc -b`. It was restored and not committed.
