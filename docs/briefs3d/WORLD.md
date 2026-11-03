# The Journey of Govinda — WORLD wow pass (READ FULLY)
Repo /workspace/govinda-journey (Vite+React18+R3F8+drei9+three0.170+@react-three/postprocessing 2.19). Dev server
runs at http://localhost:5190/ (never start/stop it). Read docs/AGENTS.md rules first (disk, one Chrome, no installs,
no npx downloads, never pkill/kill, never git).

The game is now level-by-level: arrive at an island → big chapter title (Overlay) → the in-world 3D game for that
island (other agents are writing src/levels/<ID>/Play.tsx — do NOT touch src/levels/*) → on win the store phase goes
'won' for 2.6 s (Unlock squash/flare/leaf burst + badge; already implemented in World.tsx), then 'arrived' with the
story card and 'Walk on' → the bridge to the next island builds itself (BridgeReveal) → walk (GLB student, walk anim).
State: src/state/store.ts (current, target, solved, phase). Levels: src/levels/registry.ts (11 islands, last = finale L09).

YOUR FILES: src/world/World.tsx, src/world/Effects.tsx, src/world/kit.tsx (careful, shared visuals), new files under
src/world/. Do NOT edit src/ui/*, src/levels/*, store, play.tsx API (you may add exports to play.tsx).

Owner's wow list — implement all, tasteful, warm clay, never neon/cyberpunk, no text in 3D:
1. Cinematic opening: while phase==='intro' (not started) the camera starts high in/above the clouds and slowly sweeps
   down toward island 0 over ~4–5 s as the title rises (Overlay delays the title ~0.9 s). When the visitor presses
   Begin, ease into the normal island framing. Revisits (started persisted) skip the sweep.
2. Frame one island at a time: tighten/settle the camera on the current island; neighbours only as soft silhouettes
   (fog). While 'playing' frame the play space (island-local x∈[-1.6,2.2], z∈[-0.5,2.4]) a little closer — keep it
   fully visible in portrait 390x844 too (hint pill at the bottom, title at top: keep the action in the middle).
3. Day → golden hour → night with progress (index current/(N-1)): lerp sky dome colours, fog colour, hemisphere +
   sun colour/intensity/angle. Islands 0–3 day, 4–6 golden hour, 7–9 dusk, 10 night with a deep warm indigo sky (not
   black, not neon) and stars (few, soft). Smoothly animate between islands while walking.
4. Lanterns: small clay lanterns on the bridge posts and on solved islands glow warmly, more visible as it gets darker.
5. Bridge reveal drama: when 'Walk on' becomes available the bridge already builds (BridgeReveal); make it a moment:
   planks drop in one by one with a small bounce (instead of the uniform stretch), dust puff on the far end, the camera
   briefly glances toward the next island then returns. Keep it < 2 s and robust if the user taps Walk on early.
6. Grand finale: after the finale (L09) is solved (phase 'arrived', current = last, solved includes 'L09'), slowly pull
   the camera back and up to reveal the whole lit-up path of islands at night (all lanterns on, windows glowing),
   gently orbiting. The story card stays on screen (left/bottom), so compose the world to the right/top.
7. Effects: gentle bloom on emissives only (luminanceThreshold high, low intensity), keep N8AO + subtle tilt-shift,
   vignette. ?lite and weak GPUs (PerformanceMonitor decline) must still look right without FX. 60fps target.
8. Robustness: no flashes, no camera jumps on reload or ?qa&at=<ID> jumps, no console errors/warnings.

Check with: npx tsc --noEmit -p . ; node scripts/shoot.mjs http://localhost:5190/ proofs/world (and
`node scripts/level-check.mjs L01`, at most 3 runs total of any Chrome script; they share a lock). Also write a small
scripts/world-shots.mjs if helpful that uses the same lock + fixed profile (/tmp/gj-chrome-profile) and shoots: intro
at 1s and 4s, island 4 (?qa&lite&at=L05 — note lite disables FX), and the finale (?qa&at=L09 then
window.__journey.win() and wait 6 s) at 1440x900 and 390x844. Look at the shots and judge honestly vs. a cozy
premium clay miniature town. Write docs/notes/world-3d.md (≤ 20 lines) and stop.
