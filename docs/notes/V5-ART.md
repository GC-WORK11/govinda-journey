# V5-ART notes

## Step 1+2 done — CC0 packs fetched & optimised
- Sources: Kenney (nature/train/furniture kits, zips via kenney.nl signed download-link),
  KayKit GitHub raw (dungeon remastered GLBs self-contained; city builder + furniture bits as
  gltf+bin+shared texture), Quaternius via poly.pizza per-model GLBs.
- No gltf-transform in node_modules → wrote a small python GLB repacker (strip normal/ORM maps,
  re-encode colour maps ≤256px, rebuild buffer views). Quaternius 19 models: 32MB → ~4MB.
- public/ total ≈ 9 MB (budget 25 MB). LICENSES.md written in public/models/packs.
- KayKit Furniture "bits" has no laptop; Kenney furniture-kit DOES (laptop.glb, computerScreen…).

## Requests to other areas
- WORLD: `src/v5/art/*` will export `IslandBase`, `Water`, `Clouds5`, `Prop`, `Scatter`, `PROPS`,
  `Effects5`. IslandBase props: `{id, radius, palette, seed}`; it self-registers the top disc as
  walkable via core.useWalkable. Water/Clouds5 take optional `y` (water plane) — defaults tuned for
  ~16m island spacing. Effects5 reads `?lite` itself.
- PLAYER: none.

## TODO
- material.ts toon(), applyToon()
- IslandBase, Water, Clouds5, Dressing (Prop/Scatter/PROPS), Effects5
- screenshot iterate 1440x900 + 390x844
