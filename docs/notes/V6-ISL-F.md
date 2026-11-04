ISL-F / L08 — sign-language plaza, game pieces front-centre: guardian/gate/tablet at mid-path
(z≈-2, guardian ×1.2), V4 studio (clay hands) front-west ×1.35, board near entry, hint pill
(registry `hint`, gated on active frontier island) while unsolved; plaza dressing behind.

Perf: instanced tiles/pennants + merged statics (~7 draws) + StaticBake merges studio/props to a
few draws; castShadow off small props. Crash fix: cleanGeo canonicalises attrs (non-indexed, no
tangents/morphs) and mergeSafe never returns an unchecked null — L09 page blocker resolved.
Pill fix: ensureCss now runs in useDomOverlay (was Veil-only → pill rendered unstyled = missing).

FOR QA — URL http://localhost:5190/?qa&at=L08&unlock (desk+mob): clay hands big front-left,
guardian mid-path, hint pill "Tap the hand that matches" bottom-centre, board E → card + Live
link, speak hello → trace V → sign granted. Note: the world-mounted parity dome + caption
position are WORLD's files, outside my area.
