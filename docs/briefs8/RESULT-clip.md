# RESULT — clip (V8): ropes, bridges, props vs islands/props

Scope: L01–L09, I01, I02, finale — nothing may pass through an island body
or through another prop. Method: systematic geometry audit (new deep
auditor, vertex-in-island-body raycast test + world Box3 prop pairs),
plus the V7 prop-placement fixes already on main (clipA–clipD) verified
held.

## Fixes landed

### 1. Bridge5 — deck/rope boardwalk over island rims (the systematic bug)

Every bridge deck ran *inside* the island's lathe lip at both ends: the
deck profile sagged from the mouth anchors, so between r≈4.2 and the lip
edge the plank run sat below the overhanging grass lip. Upstream's V7
`sin²` fix (973a06b, flat-tangent mouths + pulled posts + tied rope ends)
reduced it but did not remove it — the offline audit still measured deck
embedded on **all 20 mouths**, worst 0.55 m into L06 plus rope hits into
I01/L05/L06.

This branch layers the real fix on top of upstream's improved file (their
post pulls, rope ties and walk-strip tapers kept): `deckY` now runs **flat
at island-top + 0.05** from each mouth out to where the path clears that
island's rim circle (RIM_CLEAR = 5.85 ≥ lip bulge 1.04·R + wobble ≈ 5.66),
then lerps + sags only across the open-air span. Planks read as a little
boardwalk onto each rim; the profile is continuous, and the walk strip
follows it so the player's feet match the visible deck.

Verified with `scripts/v5/clip-offline.mjs` (exact island lathe + bridge
geometry replica + down-raycast inside test):
- upstream `sin²` profile: **410 embedded vertices** across the 10 spans
- boardwalk profile: **0**

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
