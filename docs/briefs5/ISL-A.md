AREA: ISLAND OBSTACLES for: L01, L02. Files: src/levels/<ID>/Obstacle.tsx (+ any helper files in
src/levels/<ID>/ named *.v5.tsx). Notes: docs/notes/V5-ISL-A.md
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
- L01 IIT Patna 2023 (tutorial): small campus courtyard, a desk with a laptop under a tree. Floating
  quiet hints teach move (joystick/WASD), jump (a low wall to hop), use (E on the laptop). Using the
  laptop opens the gate at the exit. No ability granted.
- L02 Rejections: exit gate is closed and the exit is on a higher ledge (1.6 m, too high to jump).
  5 rejection letters lie scattered (some behind rocks, one on a small rise). Walking into a letter
  picks it up; each one flies and folds into a stone step leading up to the ledge (steps appear in
  order). When all 5 are steps, the player climbs to the ledge; gate opens; complete() → grants climb.
