# V6 — PLAYER

Status: Heli flight controller + tight movement/camera pass implemented; real-input verification in progress on the shared Chrome lock.
Own: src/v5/player/** — Heli.tsx (new), Player.tsx, Controls.tsx, input.ts, uiState.ts, Sandbox.tsx.
Heli contract for ISL-E (L06): `<Heli id pad exit? seatY? label? ceiling? range? onBoard? onLand?>{model}</Heli>` — E/tap board, WASD/joystick fly, Space/Shift climb/sink, hover + soft bounds, pad landing auto-exits at `exit`.
