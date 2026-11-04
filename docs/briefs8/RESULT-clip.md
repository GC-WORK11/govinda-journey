# RESULT — clip (V8): ropes, bridges, props vs islands/props

Scope: L01–L09, I01, I02, finale — nothing may pass through an island body
or through another prop. Method: systematic geometry audit (new deep
auditor, vertex-in-island-body raycast test + world Box3 prop pairs),
plus the V7 prop-placement fixes already on main (clipA–clipD) verified
held.

## Fixes landed

### 1. Bridge5 — deck/rope boardwalk over island rims (the systematic bug)

Every bridge deck ran *inside* the island's lathe lip at both ends:
`deckY` lerped between endpoint anchors (on the island top) and started
the sag immediately, so from r≈4.2 to r≈5.8 the plank run sat below the
overhanging lip the whole way out — worst on climbing spans (e.g. into
L06: deck down to −0.79 vs lip top ≈0.3 → 0.67 m buried). Rope rails
grazed the same lip on high-target islands. V7 audits had flagged the
buried ends as "anchored ~0.1 by design"; measured across all ten spans
it was the dominant clip in the world.

Fix in `src/v5/world/Bridge5.tsx`: the deck profile now runs **flat at
island-top + 0.05** from each mouth out to where the path clears that
island's rim circle (r = 5.85 ≥ lip bulge 1.04·R + wobble ≈ 5.66), then
lerps + sags only across the open-air span. Rails follow the same
profile; the invisible walk strip matches. Planks read as a little
boardwalk onto each rim — same look, zero burial, continuous profile.

Verified offline (`scripts/v5/clip-offline.mjs`, exact lathe + raycast
replica): **0 embedded vertices / 0 lip intersections on all 10 spans**
(before: 20 deck runs buried, 13–40 verts each, max depth 0.67).

### 2. Audit tooling

- `scripts/v5/clip-deep.mjs` — one `?qa&fresh&nomerge&lite` session,
  teleports island-to-island, audits unsolved + solved + finale states:
  - every visible mesh's sampled vertices raycast against each island's
    lathe body (world-space odd/even inside test — catches ropes, fences,
    ledges, planks through the rock/lip, not just AABB touching);
  - same-island prop-vs-prop world-`Box3` intersections with
    grazing/shared-parent filters;
  - `--shots` drops a red marker on findings and saves evidence JPEGs.
- `scripts/v5/clip-offline.mjs` — headless replica: exact island lathe +
  bridge deck/rope curves in node, no browser needed.
- `scripts/v5/probe.mjs` — deck formula updated to the boardwalk profile.
- `scripts/v5/clip-audit.mjs` — **clipC's auditor, unchanged** (my deeper
  run lives at clip-deep.mjs; a rename conflict during rebase was
  resolved in clipC's favour).

## Verification

- `npx tsc -p . --noEmit` — clean.
- `node scripts/v5/clip-offline.mjs` — 0 findings, all 10 bridge spans.
- `node scripts/v5/clip-deep.mjs http://localhost:5304/ --shots` —
  see `proofs/v5/clip-audit.json` + JPEGs (results below).
- `node scripts/v5/play.mjs http://localhost:5304/ ...` — see below.

## Audit results (fill after run)

TBD

## Remaining known items

- Shared Chrome was saturated all session (9+ agents on one lock); the
  in-browser audit/play evidence is appended as slots allow.
- V7 clip sessions already fixed prop placements (L01–L09, I01/02); this
  pass re-audits rather than re-does their work.
