# V6 ISL-E notes (owns src/levels/L06 only; L07 → gj6-L07)

## L06 Remote — voxel city + helicopter
- Skyline: 8 VoxelTowers (baked facade textures, toon), street + plaza paving,
  KayKit city props (water tower, streetlights, bench, box, bush). Kept low in
  the middle/north so the caption band stays on open sky.
- Remote vignette beside the path: desk + laptop + phone on easel stand.
- Flight: E boards the clay heli at the home pad (interactable `L06-heli`).
  Takeoff climb, then steer WASD/joystick; Space/Shift trims altitude but a
  weak auto-altitude assist follows the next ring — touch needs only the stick.
  5 route rings on ONE arc: pad → out over the west rim → far landing rock.
  Landing there unfolds a plank bridge back; complete() → remote.
  E mid-flight rides the autopilot home (escapable); landing home re-docks.
- Heli visual + flight loop are the STUB until PLAYER's src/v5/player/Heli.tsx
  lands — contract: same interactable id, same physics feel, local coords.
- PhoneUI.v5.tsx is dormant (no DOM overlay except a fading hint line).
- `window.__l06dbg` = { phase(), passed(), heli(), next(), pad() } world-space,
  always installed by the obstacle (used by my real-input verify + solver).

## For QA / Govinda — verify URL
`http://localhost:5190/?qa&at=L06` (fresh context or cleared localStorage —
the save persists `done`).
Check at 1440x900 and 390x844:
1. Island reads as a city; caption text sits on open sky, not over towers.
2. Walk to the helipad beside the path (east side); `E Board the helicopter`.
3. Takeoff auto-climbs; steer through the 5 warm rings west → far rock pad
   (it lights once all 5 pass). Touchdown unfolds the plank bridge; step out
   on the rock; `done`/`remote` granted; walk back over the bridge to exit.
4. No stuck states: E mid-flight flies home and re-docks; the home pad only
   re-lands after the heli has left and returned low+slow (leftPad latch —
   fixed a bug where it landed straight after takeoff).
Known-partial: my real-input run reached pad + boarded + flew (phase fly),
but pre-fix it re-docked home early; the far landing path needs one live
confirm pass.

