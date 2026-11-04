# RESULT storyA: story and taglines for L01, L02, L03

Status: copy and in-world beats are committed (9f2d8ef, pushed). Screenshot read-back and play.mjs were queued behind the shared Chrome lock at the time of writing; see "Verification" for what has run.

## What changed

| File | Change |
|---|---|
| src/levels/registry.ts | L01 `story`: "For four years I have built things people can open. I love sharing what I learn." (was "I am an undergraduate ..."; the arrival line already says the degree). L03 `tech` (solve caption, also the finale card for L03): "All four are React front ends, shipped on Vercel. Doorway IDE: several AI models side by side, from one thin page." (was the desktop Doorway cockpit line). |
| src/levels/L01/shared.v5.tsx | New export `say(text, ms)`: sets the caption and clears it after `ms` if it is still showing. |
| src/levels/L01/Obstacle.tsx | When the traveller crosses the low wall (first time), Govinda speaks `L01.story` for 5.2 s. |
| src/levels/L02/Obstacle.tsx | When the fifth stone is set, the stones speak `L02.story` for 5.2 s. |
| src/levels/L03/Obstacle.tsx | Picking up a page speaks that project's tagline for 4.6 s (CEO Hunt, Flow Pitch, Delegators Workbench). Walking into the weekend bench (within 2.6 of the studio, once per visit) speaks `L03.story` for 5.2 s. `caption()` takes an optional duration (default unchanged, 2.6 s). |
| docs/FACTS.md | New row: "I love sharing what I learn." (L01). New subsection "L03 project lines" with the four project taglines and the L03 solve line. |

Code style: no comments added or removed; the stale L03 header comment ("First websites") is left as it was.

## How the story reaches a visitor (V5 route)

The default route is V5 (`World5`). It does not mount `Overlay`, so `registry.ts` `story` and `hint` are not drawn there (they only show on `?v4`). The V5 channels are:

1. Arrival caption: `L.line` (src/v5/ui/Chrome.tsx:27), eyebrow `L.place`.
2. In-world beats: `setCaption` calls from the level Obstacle (the four lines below).
3. Solve caption: `L.tech` (src/v5/ui/Chrome.tsx:38), eyebrow "place · badge", for 6 s.
4. Game hints: PillHint or world labels (unchanged game copy).

## In-world copy and FACTS lines

Every claim below is quoted from docs/FACTS.md (the claim cell of the row, unless noted).

| Level | Where it is spoken | Text on screen | FACTS line quoted |
|---|---|---|---|
| L01 | arrival caption (unchanged) | I study Computer Science and Data Analytics at IIT Patna, and I build software and ML systems. | "I study Computer Science and Data Analytics at IIT Patna, and I build software and ML systems." (L01 table, registry.ts:19) |
| L01 | on crossing the wall (new) | For four years I have built things people can open. I love sharing what I learn. | "For four years I have built things people can open." (L01 table: "I am an undergraduate at IIT Patna. For four years I have built things people can open.") and "I love sharing what I learn." (new L01 row, S1 header) |
| L01 | solve caption (unchanged) | This world is a game about my projects. Each project island opens after a short game that shows how the project works. | "This world is a game about my projects. Each project island opens after a short game that shows how the project works." (L01 table) |
| L02 | arrival caption (unchanged) | Some gates stay shut. Five letters can still become stepping stones. | "Some gates stay shut. Five letters can still become stepping stones." (L02 table, game metaphor, n/a) |
| L02 | fifth stone set (new) | Five letters, five stones. Each closed gate becomes a step up. | "Five letters, five stones. Each closed gate becomes a step up." (L02 table, game copy, n/a) |
| L03 | arrival caption (unchanged) | Small web products, built on weekends and shipped online. | "Small web products, built on weekends and shipped online." (L03 table) |
| L03 | weekend bench (new) | CEO Hunt, Flow Pitch, Delegators Workbench and Doorway IDE are weekend builds you can open today. | "CEO Hunt, Flow Pitch, Delegators Workbench and Doorway IDE are weekend builds you can open today." (L03 table, S1 and S13) |
| L03 | page 1 pick-up (new) | CEO Hunt: a calm meeting ground for founders, investors, and operators. | "CEO Hunt: a calm meeting ground for founders, investors, and operators." (new L03 project lines; S1: "CEO Hunt — A calm meeting ground for founders, investors, and operators.") |
| L03 | page 2 pick-up (new) | Flow Pitch: agent workflows, redesigned for a phone screen. | "Flow Pitch: agent workflows, redesigned for a phone screen." (new L03 project lines; S1: "Agent workflows redesigned for a phone screen, shipped in a weekend as a live pitch site.") |
| L03 | page 3 pick-up (new) | Delegators Workbench turns plans into finished documents. | "Delegators Workbench turns plans into finished documents." (new L03 project lines; S1: "Its Workbench side turns plans into finished documents.") |
| L03 | solve caption (new) | All four are React front ends, shipped on Vercel. Doorway IDE: several AI models side by side, from one thin page. | "React front ends, shipped on Vercel." (L03 table) and "Doorway IDE: several AI models side by side, from one thin page." (new L03 project lines; S1: "Talk to several AI models side by side from one thin page, no heavy install.") |

Taglines: L01 has one (the arrival line), L02 has one (the arrival line, game metaphor), and L03's four projects each have one (the page pick-ups; Doorway IDE's is on the solve caption, because the four pages hold only three gaps).

## Decisions and open items for the owner

1. **L02 has no sourced project.** Every FACTS row for L02 is game copy (n/a). The brief's "what he built, why, problem solved" cannot be met for L02 with sourced claims. L02 copy is kept to the game metaphor. Needs a sourced claim, or accept it as a bridge level.
2. **Delegators Workbench mapping.** The résumé (S1) says "Its Workbench side turns plans into finished documents" under Delegators. I mapped that to delegators-workbench.vercel.app. Please confirm.
3. **Desktop Doorway removed from L03.** The old L03 solve line said "Doorway, a desktop app, is a cockpit ...". The linked "Doorway IDE" is the web app (FACTS: the desktop repo is "a separate product"), so that line was under the wrong label. It was dropped from L03. If wanted, add it as its own line for the desktop app.
4. **Finale card.** src/v5/ui/Finale.tsx (storyD) shows L03 `tech` when `techVerified('L03')` is true, so the finale now shows the new L03 solve line. Check it reads well (not my file; not changed).
5. **Overlay story is V4-only.** `story` is now a spoken line on V5. The V4 Overlay panel still prints it (fine), but the V5 route has no panel.
6. **Unused in V5:** `task` (no reader) and `WHEN` in src/v5/core.ts (2023 and 2024 labels, not rendered). core.ts is the integrator's file, so left alone.

## Verification

- `nice ./node_modules/.bin/tsc --noEmit -p .`: passes (exit 0), run after the edits.
- Dev server: my port 5211 (strictPort), responding (HTTP 200).
- Screenshot read-back at 1440x900 and 390x844 (lite): queued behind the shared Chrome lock. Output goes to proofs/v7/storyA/ (gitignored): `<size>-L01-arrival.jpg`, `-L01-story-beat.jpg`, `-L01-tech.jpg`, `-L02-five-stones.jpg`, `-L02-after-solve.jpg`, `-L03-arrival.jpg`, `-L03-studio-beat.jpg`, `-L03-cap-N.jpg`, `-L03-solved.jpg`. Each run logs the caption box (`box`, `vw`, `vh`, `overflowY`).
- play.mjs L01-L03 at 390 `--lite` and at 1440: queued after the screenshots (logs /tmp/gj7-storyA-tools/play390.log and play1440.log). The result will be added here.

Still to confirm: caption overflow at 390 (the caption is one line that wraps; the longest line is the solve caption, about 120 characters).
