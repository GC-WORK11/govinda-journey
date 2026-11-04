# V6 FACTS status (2026-11-04)

## Result
- The 12 rows marked `no` from the last full pass: 9 resolved (1 cut, 3 fixed in committed code, 5 fixed in this commit). 3 open: rows 4, 5 and 6, the Ribbon year labels (a WORLD file).
- One extra row added this pass, also open under the same decision: the 2025 axis label in `src/v5/ui/Ribbon.tsx`.
- Committed in this commit, by path only: `docs/FACTS.md`, `docs/notes/V6-FACTS.md`, `src/levels/L04/street.v5.tsx`, `src/levels/L05/Game.tsx`, `src/levels/L08/plaza.v5.tsx`, `src/levels/L09/Game.tsx`.
- Left alone: `src/v5/ui/Ribbon.tsx` (WORLD file, identical to HEAD) and `tsconfig.tsbuildinfo` (tool output).
- Not run: tsc (box rule), any browser or play run (no-browser rule), playthrough.
- Nothing pushed.

## The 12 `no` rows

| # | FACTS row | Outcome | Evidence | Verified now |
|---|---|---|---|---|
| 1 | Contact: X (was x.com/Govinda_00000) | Cut. Not in CONTACT. | HEAD `src/levels/registry.ts` CONTACT: Email, GitHub, LinkedIn, Résumé | n/a (removed) |
| 2 | Project list includes L01 (Finale.tsx:17) | Fixed in committed code. PROJECTS is L03, L05, L04, L06, L07, L08. | HEAD `src/v5/ui/Finale.tsx:16` | yes |
| 3 | Finale project list includes L01 (Résumé link and tech) | Same fix as row 2 (duplicate row). | HEAD `src/v5/ui/Finale.tsx:16` | yes |
| 4 | Ribbon year 2023 for L01 and L02 (core.ts:22) | OPEN. The 2023 label still shows at HEAD. Ribbon.tsx is a WORLD file, not changed here. Patch below. | `src/v5/ui/Ribbon.tsx:22` | no |
| 5 | Ribbon year 2024 for L03 and I01 (core.ts:22) | OPEN. The 2024 label still shows. Same patch. | `src/v5/ui/Ribbon.tsx:23` | no |
| 6 | Ribbon year 2026 for I02 (core.ts:23) | OPEN. The 2026 label covers L05 to L09 (sourced) and also I02 (no source). Same patch. | `src/v5/ui/Ribbon.tsx:25` | no |
| 7 | "each island is a short game about something real I built" (HowTo.tsx:48-49) | Fixed in committed code: now "Each project island is a short game…". | HEAD `src/v5/ui/HowTo.tsx:48-49` | yes |
| 8 | "Give each laptop only the layers it can hold." (L05/Game.tsx:159) | Fixed: now "shards". S9 supports shards ("real shards over LAN and Tailscale"). | `src/levels/L05/Game.tsx:159` (this commit) | yes |
| 9 | L05 GB labels and totals (L05/Game.tsx:5, 7-10, 47, 160, 169) | Fixed: GB labels and totals removed. "one 27B model" kept (S9, RUN 03). LAYERS and LAPTOPS stay in code and are not shown. | `src/levels/L05/Game.tsx:47, 160, 169` (this commit) | yes |
| 10 | AQI readings 232, 187, 168, 151 (L04/Obstacle.tsx:33-35) | Fixed: `aqiTagTex` draws only the "AQI" label. The array stays in code. | `src/levels/L04/street.v5.tsx:304-317` (this commit) | yes |
| 11 | Helper demo (L09/Game.tsx:123, 134) | Fixed: "Three quick questions about plants." and "Tap send to start the quiz.". Emoji avatar removed. Quiz facts sourced: https://en.wikipedia.org/wiki/Photosynthesis | `src/levels/L09/Game.tsx:122-134` (this commit) | yes |
| 12 | Canvas "Sign Flow" on the plaza board | Fixed: now "Sign-Flow". The other two phrases already match S6. | `src/levels/L08/plaza.v5.tsx:191` (this commit) | yes |

Counts: 9 resolved. 4 open: rows 4, 5 and 6, plus the extra 2025 row.

## Ribbon: patch for WORLD (not applied here)
In `src/v5/ui/Ribbon.tsx`, delete lines 22–25 (the four entries `['2023' …]` through `['2026' …]`). The `YEARS` array becomes empty. Tick positions and the `T` map stay as they are. Apply and commit only with WORLD's OK.

Owner decision: apply this patch, or source the dates. Sourced today: 2026 for L05 to L09 (S3 repo dates, S9 Ent runs). Not sourced: 2023, 2024, the 2025 mark, and I02's year.

## Still needs owners
- WORLD: the Ribbon patch above (rows 4–6 and the 2025 row).
- Owner: confirm the X handle before adding it back (not on screen).
- Owner: Chalk has no public source. It stays removed until one exists.
- Owner: the 53.7% figure is not on screen. Any future use must keep the static-run quality caveat (FACTS open item 4).

## QA handoff (to run; agents do not run browsers)
Dev server on :5190 (QA or Govinda starts it). Check each URL at 390x844 and 1440x900, with 0 console errors:
- `http://localhost:5190/?at=L05&play`: hint "Give each laptop only the shards it can hold."; caption "one 27B model"; no "GB" text on the laptop chips or the slabs.
- `http://localhost:5190/?at=L04&play`: the AQI sign tags show only "AQI", with no digits.
- `http://localhost:5190/?at=L09&play`: the teacher bubble reads "Three quick questions about plants."; hint "Tap send to start the quiz."; the avatar is now an empty circle, so check it looks right.
- `http://localhost:5190/?at=L08&play`: the plaza board reads "Sign-Flow".
- `http://localhost:5190/`: the ribbon shows 2023, 2024, 2025 and 2026 until WORLD applies the patch above.
