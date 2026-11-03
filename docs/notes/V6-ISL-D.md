# V6-ISL-D — L04 Alive (smoggy Delhi street) + I02 On the road (across India)

Status: built + code-verified; awaiting real-input Chrome pass (agent browsers banned —
QA/integrator please run the checks below). `240k places` removed (FACTS.md absent,
d69c7b3). Solve hooks `__journey.solve.L04/.I02` register at module scope (9692157) —
no mount gating can hide them; each settles `useV5.done` after the real walk runs.

## For QA / integrator — exact checks (1440x900 and 390x844, then once at `--lite`)

URL: `http://localhost:5190/?qa&at=L04&unlock&fresh`
(or `scripts/v5/play.mjs --only=L04,I02 --size=1440|390`)

**L04** (grants `sense`; needs `power` — `unlock` supplies it):
1. Island reads as smoggy Delhi street: cracked asphalt strip z∈[0.55,−2.75] with
   layered warm smog, kerbs, debris, AQI readers on the kerbs, sensor post near the
   mouth, lattice tower on the far bank, rooftop houses (tank/stair/clothesline),
   municipal lamp, trees, cable span.
2. REAL INPUT: walk to the post (local ≈ −0.95,1.05) → E powers it (prompt
   disappears, free teaching pulse). E again → expanding ring, `AQI nnn` tags
   surface on readers, six safe stones glow warm ~4 s (cooldown ~2.2 s).
3. Cross on the six raised stones (zig-zag); standing on the street bed >0.6 s
   crumbles + dusts + blinks back to the street mouth.
4. E at the far tower (local ≈ 0.9,−3.5) → smog clears outward ~4.2 s, lamp +
   windows warm → `useV5.done` gains `L04`, `abilities` gains `sense`, gate opens.
5. Mobile: joystick walks, use button fires post/pulse/tower prompts.

**I02** (no ability — calm interlude):
1. Small platform + nameboard + bench/luggage/churn + tea stall + station lamp on
   the sandy cap; rail causeway behind the island's right shoulder (x≥2.2) with
   twin rails, sleepers, stone ribbon, hanging pylons, a siding + buffer stop.
2. Loco + 2 cream cars + steam cross every ~22 s (~8 s pass).
3. REAL INPUT: walk past local z<−1.15 → lamp warms ~1.4 s → `useV5.done` gains
   `I02`; abilities unchanged (still just climb/build/power/sense).
4. `__journey.solve.I02` exists; drives the real walk then settles done.

Watch for: no merge/boundingSphere console errors (I02 track fix holds), no
crumbling while grounded on raised stones, gate opens only after done.
