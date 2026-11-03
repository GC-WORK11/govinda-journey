Read /workspace/govinda-journey/docs/AGENTS.md first and follow it exactly. Then read src/levels/registry.ts , src/levels/types.ts and src/world/kit.tsx. Look at docs/refs/town.jpg.

YOUR JOB: WORLD ART + PERFORMANCE. Own: src/world/ (World.tsx, kit.tsx, layout.ts, Traveller.tsx). Do NOT touch src/levels/*.
Goal: make the 3D world look like a premium tilt-shift clay miniature (docs/refs/town.jpg), not a tech demo.
1. Tilt-shift depth-of-field feel + soft warm lighting. @react-three/postprocessing (v2) + postprocessing are ALREADY installed; use TiltShift2 / N8AO / SMAA sparingly. Postprocessing must be
   disabled in ?lite mode and on weak GPUs (PerformanceMonitor decline), with no visual breakage.
2. Better islands: grass edge lip, small flower clusters, rocks, a soft path of stepping tiles from the bridge to the stand
   point, slight colour variation per island (palette.ground in registry), soft ambient occlusion look (darker contact).
3. Nicer bridges (rope rails, posts) and gentle drifting clouds below/around islands; sky as a soft warm vertical gradient.
4. Traveller: cuter, rounder, clay figure (kurta, backpack), walking cycle with arm swing, idle breathing, small shadow blob.
5. Camera: cinematic glide between islands (slight arc + ease), frame the building in the right two-thirds on desktop
   (text sits bottom-left) and in the top half on mobile (text sits at the bottom). Never clip the island.
6. Perf: initial JS < 1.2 MB gzip total, 50+ fps on a mid laptop; cap DPR; only near islands render dioramas (keep that).
Check with: node scripts/shoot.mjs "http://localhost:5190/?lite" proofs/world  (and look at the PNGs) and
http://localhost:5190/?qa&lite&at=L05 etc. Write docs/notes/world.md when done.
