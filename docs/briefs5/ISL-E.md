AREA: ISLAND OBSTACLES for: L06, L07. Files: src/levels/<ID>/Obstacle.tsx (+ any helper files in
src/levels/<ID>/ named *.v5.tsx). Notes: docs/notes/V5-ISL-E.md
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
- L06 Remote: a switch sits on a small separate floating rock you cannot reach (gap too wide). A
  smog bank on the path needs sense (pulse reveals the path; if has('sense') E pulses here too).
  At a dock, E opens the phone UI (DOM overlay styled as a phone: minimal dark-cream UI): a joystick
  in the phone drives a small drone in the 3D world (camera follows the drone); fly into the switch
  → a bridge extends; close phone → complete() → grants remote. Landmark: laptop on a desk with a
  terminal glow, phone on a stand.
- L07 Wispr Wrap: a door blocks the exit. A small robot on the far side of a gap holds a phone; use
  remote (E at the console, requires has('remote')) to bring the robot close. Then the door asks
  for a word (show the word, e.g. "open"). Press E: Web Speech API listens (if available and
  allowed) else a minimal text input; the recognised text visibly flies as letters from the phone
  to the laptop by the door; the laptop types it; the door opens → complete() → grants voice.
