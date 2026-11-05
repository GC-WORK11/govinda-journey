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

### 2. bridgeLampSpots — mouth lamps were world-absolute height (in-browser finding)

`bridgeLampSpots` placed the four mouth lamp globes at `setY(0.68)` —
an **absolute** world height. On every island above y≈0.7 (all but L01)
the lamps were inside the island's rock cone: invisible, and the audit
flagged their frames/glass at 0.44–2.39 m deep inside L04/L05/I02/L09
mouths. Fixed to `end.y + 0.68` (globe hovering just above each post
finial, as the doc comment intends). `src/world/Lanterns.tsx`.

### 3. Audit tooling

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
  full-run output `proofs/v5/clip-audit.json` + `clip-*.png` (queued).
- `node scripts/v5/clip-spot.mjs http://localhost:5304/` —
  `proofs/v5/clip-spot-L06-mouth.png` (queued).

## Verification status

- `npx tsc -p . --noEmit` — clean. `pnpm build` — clean.
- `node scripts/v5/clip-offline.mjs` — **0 embedded vertices** across all
  10 bridge spans (upstream sin² baseline: 410; original sag: worse).
- Merged to `main`: boardwalk fix at 57a52ae, lamp fix at 0ab3b0d
  (fast-forward, `pnpm build` passing each time).
- `scripts/v5/clip-spot.mjs` — **`proofs/v5/clip-spot-L06-mouth.png`**:
  the boardwalk visibly lies flat across L06's rim, sag beginning only
  past the lip; ropes hang free.
- `scripts/v5/clip-deep.mjs` ran all 11 islands × pre+post (118 shots in
  `proofs/v5/clip-*.png`) before a vite-HMR reload killed the finale
  page — island coverage complete, finale not reached. Remaining
  findings after triage:
  - bridge mouth lamps inside cones → **fixed** (item 2)
  - L05 table/plinth columns, I02/L09 lantern poles (0.6–3.5 m) and L03
    rim rocks (~1 m) — planted anchors, the established half-buried clay
    look; shots confirm nothing visibly wrong
  - L05 diorama root-cable tubes ~0.5 m — intentional "roots into soil"
    (clipB documented this design)
  - `Scene::Rogue_Leg*` 0.37–0.45 m on every island — the traveller's
    feet sit below the grass dome; the known broken-player issue, other
    brief's domain
  - note: detector picks each island's deepest mesh as its body — on L05
    the satellite shard rock may win, so deep hits near the shard can be
    attributed loosely
- Environment note for everyone: this box exports `DISPLAY=:2`; under it
  SwiftShader fails WebGL context creation → all "never ready" stalls.
  Always `env -u DISPLAY` on the shared chrome (integrate learned the
  same — `env -u DISPLAY node scripts/v5/play.mjs`).

## Remaining known items

- Finale-state in-browser audit (all islands + pull-back) not yet run —
  the audit crashed on the `?finale` navigation after completing every
  island; the harness retries and is rerunnable.
- play.mjs verification runs were out-competed for the shared Chrome all
  session; integrate's own 1440+390 suite covers the merged main.
