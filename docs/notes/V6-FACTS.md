# V6 FACTS status (2026-11-04)

## Done
- Every copy field in `src/levels/registry.ts` audited and trimmed to claims with a source. Commit ec83944.
- `docs/FACTS.md` written: claim, file:line, source URL, verified, note. Includes the repo and demo table for the project islands (ISL agents).

## Verified (checked against sources listed in FACTS.md)
- Résumé text, portfolio bundle copy and contact links, GitHub profile and repo dates.
- READMEs for ALive, remote, sign-wrap, wispr-wrap and doorway; Ent page text; working paper text; WeMakeDevs hackathon dates.
- HTTP 200 for the demos and repos listed in FACTS.md. The LinkedIn URL returns 999 to scripts, so it is confirmed only by the portfolio and résumé.

## Removed or unverified
- X handle, "Chalk" product, years 2023 and 2024, Ent "layers" wording, invented GB and AQI numbers. Details and owners are in FACTS.md.

## Not done
- No browser check of the new copy (box load). Lines are longer or shorter in places, so check wrapping at 390x844 and 1440x900 later.
- No playthrough.
- tsc: one run before the commit. Errors only in `src/levels/L07/Obstacle.tsx` (kit.v5 exports), which is not my file. registry.ts had no errors. Not re-run, per instruction.

## Needs owners (see FACTS.md "Other on-screen copy")
- `src/v5/core.ts:22-23` ribbon years.
- `src/v5/ui/HowTo.tsx:48-49` "something real I built" line.
- `src/v5/ui/Finale.tsx:17` project list includes L01.
- `src/v5/ui/facts.ts` VERIFIED is empty; set L01, L03 to L09 tech and story to yes.
- `src/levels/L05/Game.tsx` GB numbers and "layers"; `src/levels/L04/Obstacle.tsx:33-35` AQI digits; `src/levels/L09/Game.tsx:123,134` Helper demo.

Nothing pushed.
