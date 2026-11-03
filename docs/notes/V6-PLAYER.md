# V6 — PLAYER

Status: Heli controller + tight move/cam done; real-input run partially verified before Chrome freeze — craft renders + prompt/buttons correct on both sizes; board/fly/land needs a QA pass (details below).
Own: src/v5/player/** — Heli.tsx (new), Player.tsx, Controls.tsx, input.ts, uiState.ts, Sandbox.tsx.
Heli contract for ISL-E (L06): `<Heli id pad exit? seatY? label? ceiling? range? onBoard? onLand?>{model}</Heli>` mounted inside the island group; exported `heli` state {pos,vel,flying,landed,seat,exitAt}.

## Verify (QA/Govinda — I cannot run Chrome)

URL: `http://localhost:5190/?sandbox&qa` (also `?sandbox` plain). Try both 1440x900 (keys) and 390x844 (touch).

1. Walk E/right from spawn to the terracotta pad ring (east rim) → prompt `E climb in` desktop / `climb in` button mobile.
2. Press E (tap the button) → student sits aboard (`__pldbg.flying:true`, anim `sit`), camera pulls back.
3. Hold Space (or jump button) → climbs; WASD/joystick → flies camera-relative; Shift/use button → sinks. Hands-off = hover; soft ceiling ~13m above pad, soft range ~30m.
4. Descend onto the sand ring → auto-lands and steps off at the exit point SE of the pad; `flying:false`, prompt returns.
5. `__journey.heli` (qa only): pos()/flying()/board(). `__pldbg` now also shows `flying`, `it` (nearest interactable id), `useDt`.

## Caveats from my partial run

- Mobile tap on `v5-use` did not appear to fire `use()` in my Puppeteer run (prompt showed, `flying` stayed false). Changed the button to fire on pointerUp (tap semantics). Please re-check the tap specifically.
- The demo pad sits ~1.5m from the carry-crate interactable; moved it further east so prompts don't overlap. On real islands keep the pad ~2.5m from other interactables.
- Landings elsewhere settle the craft without exiting (re-take-off with Space). Only the pad exits.
