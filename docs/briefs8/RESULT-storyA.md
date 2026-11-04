# RESULT: storyA (V8) — in-world project signs, L01 / L03 / L04 / L05

## What changed (props and copy on boards only)

- `src/levels/L01/sign.v5.tsx` (new): `StorySign` draws a painted board on a stake (or flush on a wall), two draw calls. `useSignTex` paints canvas text, redraws once Fraunces and Inter load, and disposes its texture on unmount.
- L01 campus block: plaque "IIT Patna" / "BS, Computer Science & Data Analytics" / "For four years I have built things people can open."
- L03 studio: fascia "Weekend builds" / "CEO Hunt · Flow Pitch · Delegators Workbench · Doorway IDE".
- L03 site board by the path (replaces the blank stripes): "Doorway" / "A desktop cockpit for visible terminal agents." / "Git worktrees, review and merge."
- L04 rooftop board: "ALive" / "240,027 Delhi places" / "Ground monitors and a CAMS model grid, rebuilt every 15 minutes."
- L05 table note, revealed when the dome drops: "Four laptops." / "One 27B model."
- L05 lectern paper: "Ent" / "Four ordinary laptops, one 27B model, over Wi-Fi."
- Spoken captions are upstream's (V7 storyA for L01 to L03, V7 storyB for L04 and L05 and I01). I did not add caption logic on top of them.
- L02 and I01: unchanged. Neither is a project, and their copy has no unsourced claims.

## Copy sources (all from docs/FACTS.md or MASTER_HANDOFF)

- Doorway board: GitHub GC-WORK11/doorway description, "Local-first desktop cockpit for visible terminal agents, git worktrees, and review/merge workflows" (S8).
- ALive: "240,027 Delhi places" (MASTER_HANDOFF; README lines 203 and 221). The air-field line is S4, and FACTS line 115 verifies "ground monitors and a model grid".
- Weekend builds names: FACTS line 83 (S1, S13).
- L01 plaque: S1 (résumé).
- L05 note and lectern: S9 ("Four laptops ... One 27-billion-parameter model") and the verified registry line.

## Correction for the owner (not on screen)

MASTER_HANDOFF says "routing cut GPU memory by 53.7%" for Ent. The paper (working-set-routing-paper.pdf, self-described "not peer reviewed") does not support that wording:

- The 53.74% figure is one static expert-deletion run (Hard-keep-28) on OLMoE-1B-7B, on two Tesla T4s. Allocated VRAM went from 12.533 GB to 5.798 GB.
- That run kept 80.65% of a custom quality score and reached 1.08x suite speed. The paper says the joint target was not achieved.
- The Ent 27B demo is a separate result: four laptops, 1.49 tok/s pooled, versus 5.65 tok/s for one Mac holding the whole model.

No 53.7% claim is on screen in this version. MASTER_HANDOFF and FACTS open item 4 should be corrected before any public use. Chalk is listed as shipped in MASTER_HANDOFF, but FACTS says it has no public source, so it is not featured.

## Verified how

- `npx tsc -p . --noEmit`: pass.
- `pnpm build`: see the commit message and the status line below.
- The dev server on :5306 served all changed modules (HTTP 200).
- `scripts/v5/play.mjs` at 390 and 1440 was NOT completed. The shared Chrome profile `/tmp/gj-chrome-profile` was held by a live Chrome from another process. The lock was acquired, then the launch failed twice. Box load was about 50 with under 1 GB available. No screenshots were reviewed.

## What's left

- Run the playtest (`play.mjs` at 390 and 1440, islands L01 to L05 and I01) once Chrome is free, then check the board text and placement on the L03 site board and the L04 rooftop.
- Draw calls: each board adds two, and the L03 and L04 islands are already above the 150 budget on main. This change does not address that.
- `src/levels/L05/card.v5.tsx` is still used upstream (EntLinks). No change from me.
- A local backup branch `storyA-v8-prev` (commit b865c22, not pushed) holds an earlier version with my own caption logic. It was dropped because upstream already speaks the story.
