# V6 · ISL-A status
- How-to-play: `src/v5/ui/HowTo.tsx` — cream veil + Fraunces goal + Inter key/touch hints, freezes the traveller, melts on first real input; skipped for ?qa/?at/returning journeys. Caption + pill hide while it is up (:has in v5.css). Verified via livecheck at 1440x900 + 390x844 (0 errors).
- Finale: `src/v5/ui/Finale.tsx` — real portfolio summary (project islands with registry links, FACTS-gated tech/stack, contact + résumé); `src/v5/ui/facts.ts` stubs docs/FACTS.md until the audit lands.
- Requests: FACTS — emit `docs/FACTS.md` then regenerate `VERIFIED` in src/v5/ui/facts.ts; anything not marked verified stays hidden.
