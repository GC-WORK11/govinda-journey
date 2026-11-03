# ART-ISLANDS: island detail + CC0 props density
Read docs/briefs3d/ART-COMMON.md first.
Scope: src/levels/*/Diorama.tsx, src/world/kit.tsx (add props there), island base meshes in src/world/ (NOT Play.tsx game logic, NOT qa scripts).
Goals:
- Islands must not look boxy: soften silhouettes, layered rock undersides with strata, grass lip overhang, small stones, flowers, tufts, path stones, fences, lamps, tiny details at the edges.
- Each island tells its project at a glance with a few strong props (campus lamps for L01, gate and letters for L02, pond for I01, easel/workbench for L03, Delhi street for L04, four laptops for L05, train for I02, desk + phone for L06, phone + laptop for L07, hands/signs for L08, school + gate for L09). Do not add text labels or icons.
- Density: more small CC0-style procedural props, instanced where many (use InstancedMesh / drei Instances) so the frame rate holds. Keep play areas clear: nothing may cover draggables, tap targets, or the traveller start at local (-0.9, 0, 1.4).
- Same warm clay palette, no neon, no saturated cartoon colors.
Verify with level-check on every level whose Diorama you touched; the qa scripts must still win.
