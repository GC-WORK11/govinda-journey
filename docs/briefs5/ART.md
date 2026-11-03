AREA: ART (public/models/packs/**, src/v5/art/**). Notes: docs/notes/V5-ART.md
Goal: it must look handmade and premium (Monument Valley / Townscaper / A Short Hike / Tiny Glade),
never primitive boxes. Disk is tight: check `df -h /` before every download; keep > 1 GB free.
1. Fetch CC0 packs (download zip to /tmp, extract ONLY needed GLB/GLTF + textures, delete zip):
   KayKit (kaylousberg.itch.io / github KayKit-Game-Assets: Dungeon Remastered, City Builder Bits,
   Furniture Bits, Adventurers props), Quaternius (Ultimate Stylized Nature, Ultimate Nature),
   Kenney (Nature Kit, Furniture Kit, Train Kit). Write a LICENSES.md in public/models/packs with
   source URL + license per pack. Budget: public/ ≤ 25 MB total.
2. Optimise: if node_modules has @gltf-transform/cli use it (meshopt + quantize + resize textures
   to ≤ 512); otherwise keep the smallest GLB variants. No new installs.
3. src/v5/art/material.ts: `toon(color, opts)` shared stylized clay material (onBeforeCompile on
   MeshStandardMaterial: wrap diffuse, soft 3-band ramp, gentle rim, keep shadows + fog working).
   `applyToon(scene)` to re-skin loaded GLBs while keeping their texture/vertex colours.
4. src/v5/art/IslandBase.tsx: props {id, radius, palette}: a stylized grassy/stone top with soft
   edges, textured layered cliffs underneath tapering to a point (rock strata, procedural noise +
   vertex colours), little hanging roots. Registers its top as walkable (core.useWalkable).
5. src/v5/art/Water.tsx (animated stylized sea far below, gentle foam), src/v5/art/Clouds5.tsx
   (soft volumetric-looking puffs, slow drift), src/v5/art/Dressing.tsx: helper `<Prop name="tree_pine" .../>`
   that lazy-loads a pack GLB by name with useGLTF + applyToon, plus `<Scatter ...>` for trees,
   rocks, grass tufts, flowers around an island rim (seeded, avoids the path corridor x∈[-1,1]).
   Export a catalogue `PROPS` (name → url) so island agents can use any prop.
6. Post FX: src/v5/art/Effects5.tsx: N8AO, light bloom, very subtle or no tilt-shift, vignette,
   SMAA. Off in ?lite.
Use the Sandbox or ?v5 to screenshot; compare against the references and iterate.
