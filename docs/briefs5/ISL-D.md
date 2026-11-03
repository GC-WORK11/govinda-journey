AREA: ISLAND OBSTACLES for: L04, I02. Files: src/levels/<ID>/Obstacle.tsx (+ any helper files in
src/levels/<ID>/ named *.v5.tsx). Notes: docs/notes/V5-ISL-D.md
Each Obstacle.tsx default-exports a component taking core.ObstacleProps, rendered inside the
island group (local coords, top y=0, radius 5, entry (0,0,4.2), exit (0,0,-4.2)).
Build the obstacle from docs/V5.md "Ability chain" for your islands as a REAL physical game the
player walks through: pieces are core.walkables/blockers, pick-up/use via core.useInteractable,
carried item uses core.player.carrying + carryAnchor (src/v5/player/anchor.ts; if missing, stub a
Vector3 that follows core.player.pos + 0.9 y). Required earlier abilities via core.has().
Use ART's props (src/v5/art/Dressing.tsx PROPS / <Prop>) and toon material once they land; until
then use src/v5/art if present, else simple placeholders you will replace. The building/landmark
of the island must be a proper prop assembly, not a box.
Payoff when solved: one calm motion (door swings, stones settle, lights warm), no confetti, then
complete(). Phone / voice / sign UIs are DOM overlays in your folder: soft, minimal, Inter font,
no boxy cards; set core.player.frozen while open; always offer a typed/click fallback.
Also add a ?qa solver for each island: window.__journey.solve = {...existing, <ID>: async () => {...}}
that solves it via the real interactions (teleport + use), so QA can play through.
Specifics for your islands:
- L04 Alive (Oct 2026): thick smog covers the island (fog volume / layered soft planes) and the
  path is hidden; off-path tiles crumble (fall → respawn). The player uses the POWER ability here: press E at the sensor post (requires has('power')) to
  power it; from then on E (or the use button) sends a pulse: a ring expands, small air-quality
  readings (AQI numbers as quiet labels) appear on posts and the safe path lights for 4 s. Reach the
  far sensor tower and power it → smog clears softly → complete() → grants sense. Delhi street
  feel: small rooftops, a street lamp, a tree.
- I02 On the road: calm interlude: a small station platform, rails, a little train passes slowly
  across behind the island every ~20 s. complete() when the player reaches the exit half.
