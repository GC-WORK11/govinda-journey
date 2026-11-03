AREA: PLAYER (src/v5/player/**). Notes: docs/notes/V5-PLAYER.md
Deliver `src/v5/player/Player.tsx` (default export, rendered inside the Canvas by World5) and
`src/v5/player/Controls.tsx` (DOM overlay: mobile joystick + jump + use buttons + interact prompt).
1. Character: load public/models/student.glb with the retint (see src/world/Traveller.tsx: skin
   texture swap + indigo backpack; reuse that code). Play its animations: idle/walk/run/jump/cheer
   (list clip names from the GLB; map the closest ones). Crossfade 0.15 s.
2. Movement: WASD/arrows, Shift run, Space jump. Camera-relative. Acceleration, deceleration,
   turn smoothing (slerp yaw), gravity, coyote time 0.12 s, jump buffer 0.12 s. Ground = raycast
   down against core.walkables; walls = core.blockers (capsule-vs-mesh via short horizontal rays or
   Box3s). Write core.player every frame (pos, vel, facing, grounded, island). Respect player.frozen.
   Fall off the world → fade and respawn at the last safe grounded point.
3. Camera: third-person follow, mouse drag / one-finger drag orbits yaw + clamped pitch, wheel/pinch
   zoom in a small range, critically damped smoothing, pulls in when a walkable/blocker is between.
4. Mobile: left-half virtual joystick (appears where the thumb lands), right side jump + use
   buttons, round, translucent, quiet (no emoji). Works with pointer events; no page scroll.
5. Interactables: each frame pick the nearest enabled core.interactables within radius, show ONE
   small prompt "E  <label>" (desktop) or the use button label (mobile); E/Enter/button calls use().
6. Carry: if player.carrying is set, the carried item follows a hand/backpack anchor (islands
   render the item; export `carryAnchor` Vector3 from src/v5/player/anchor.ts, updated each frame).
7. Footstep dust (tiny, 3-4 soft puffs per step, pooled), landing puff.
8. ?qa hooks: window.__journey.player = { pos(), teleport(x,y,z), press(key,ms) }.
Until World5 lands, test in your own src/v5/player/Sandbox.tsx reachable at /?v5&sandbox
(a flat ground + a few boxes registered as walkables/blockers). App wiring: WORLD owns App.tsx; ask
in notes if you need the ?sandbox route and add it yourself ONLY if WORLD has not after 20 minutes.
