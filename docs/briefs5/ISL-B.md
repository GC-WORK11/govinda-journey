AREA: ISLAND OBSTACLES for: L03, I01. Files: src/levels/<ID>/Obstacle.tsx (+ any helper files in
src/levels/<ID>/ named *.v5.tsx). Notes: docs/notes/V5-ISL-B.md
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
- L03 First websites: the path has 3 gaps over the void. Page blocks (thin slabs like web pages, warm
  paper colours with simple layout lines) sit on a ledge that needs climb (ledge reachable only
  with climb: a vine/handhold wall you can climb if has('climb')). Pick up a block (E), carry it,
  drop it into a gap (E near the gap) → it snaps and becomes walkable. 3 placed → the last block shows
  a small 'deployed' shimmer and complete() → grants build. A small studio/workbench landmark.
- I01 Stillness: calm interlude: lake edge, bench, reeds, fireflies. Optional: E on the bench sits
  the player for a moment (camera slowly eases). complete() as soon as the player reaches the exit
  half of the island (z < 0).
