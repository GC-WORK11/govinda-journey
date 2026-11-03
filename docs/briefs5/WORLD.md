AREA: WORLD (src/v5/World5.tsx, src/v5/world/**, src/v5/ui/**, src/App.tsx, registry order). Notes: docs/notes/V5-WORLD.md
1. App.tsx: render V5 by default; `?v4` keeps the old World + Overlay. Keep ?qa / ?lite.
   Add `?sandbox` → lazy src/v5/player/Sandbox.tsx if it exists (PLAYER builds it).
2. src/v5/world/layout.ts: ISLAND_POS for V5_ORDER (gentle S-curve rising slowly, ~16 m apart,
   islands radius 5, some height variety), ISLAND_R, ENTRY/EXIT local points.
3. World5.tsx: Canvas (shadows, ACES, dpr like V4 World.tsx, PerformanceMonitor), sky + fog,
   islands: for each, lazy `src/levels/<ID>/Obstacle.tsx` if present (import.meta.glob) else a
   placeholder; island base from ART (`src/v5/art/IslandBase.tsx` when it lands, else a simple disc
   registered as walkable). Bridges between islands: a bridge appears (rises, planks settle) only
   when the previous island is complete; register it walkable. Exit blockers until complete.
   Render <Player/> from src/v5/player/Player.tsx (lazy, guarded) and <Controls/> overlay.
4. Progression: call useV5.complete(id) via the Obstacle's complete(). Set player.island-based
   caption: arrival → registry `line`; on complete → registry `tech` for 6 s (fade). Ribbon:
   src/v5/ui/Ribbon.tsx thin line at top, years 2023 · 2024 · 2025 · 2026, tick per island, marker
   eases to the current island. Ability row: src/v5/ui/Glyphs.tsx, 7 engraved line SVG glyphs
   (climb, build, power, sense, remote, voice, sign) drawn as thin strokes, appear softly when gained.
   Fonts Fraunces (titles) + Inter (UI). No boxy panels: text on soft gradient, no cards.
5. Sky by timeline: interpolate src/world/sky.ts stops by island index (morning → golden → dusk →
   night). Lanterns light at night islands.
6. Finale: when L09 completes, pull the camera back over the whole lit world (take over camera
   from PLAYER via an exported flag in core: add `export const cinematic = { on: false }` in a marked
   add-only section), show name, one line, Resume + Contact links (reuse V4 finale links from
   src/ui/Overlay.tsx), "Keep walking" returns control.
7. Reorder src/levels/registry.ts so Ent (L05) comes before Alive (L04); do not change copy text.
8. ?qa: window.__journey.v5 = { state: () => useV5.getState(), complete(id), goto(id) (teleport
   player to ENTRY of island), project(x,y,z,id) → CSS px, find(name) }.
