AREA: ISLAND OBSTACLES for: L05. Files: src/levels/<ID>/Obstacle.tsx (+ any helper files in
src/levels/<ID>/ named *.v5.tsx). Notes: docs/notes/V5-ISL-C.md
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
- L05 Ent (Aug–Sep 2026): a dark lift platform at the back leads up to the exit (exit is on a
  high platform). 4 laptops of clearly different sizes (memory) stand on a ring of small plinths;
  4 model chunks (glowing translucent slabs of different thickness, separate clearly coloured
  pieces) are scattered; one chunk sits beyond a gap that needs build (press E at the gap edge with
  has('build') to place a plank). Carry each chunk (E) to a laptop; big chunk fits big laptop. A
  balance meter on the lift (thin ring of 4 segments) fills as correct pairs are made; wrong pair
  → chunk gently slides back out. When balanced: cables light in sequence from laptops to the lift,
  lift rises with the player to the exit → complete() → grants power. Landmark: a small home desk
  setup, Wi-Fi router, Rust-orange accents.
