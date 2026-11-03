AREA: ISLAND OBSTACLES for: L08, L09. Files: src/levels/<ID>/Obstacle.tsx (+ any helper files in
src/levels/<ID>/ named *.v5.tsx). Notes: docs/notes/V5-ISL-F.md
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
- L08 Sign Flow: a stone guardian blocks the exit and asks for a sign (it must be spoken to: E,
  requires has('voice') — the guardian only listens to speech/typed word "hello", reuse a minimal
  input). Then it shows a hand-sign shape (simple outline, e.g. an open palm or a 'V'). The player
  draws it on a DOM overlay canvas (pointer stroke); compare to the template with a simple
  resampled-point distance ($1 recognizer style), tolerant. Camera use is optional only if the user
  allows; never required. Success → the guardian steps aside → complete() → grants sign.
- L09 Chalk (finale): a small schoolhouse with dark windows. Four short beats, each uses an earlier
  ability at a station: climb a short wall, build one plank, power the bell, sign at the door
  (one-stroke shape). Each lights a part of the school. When all lit → complete(). WORLD does the
  finale camera pullback and Resume/Contact. Keep it short (under 60 s) and warm, night sky.
