# V5-ART notes

## Status
- material.ts: `toon()`/`toonVC()` shared clay material (wrap diffuse, soft 3-band ramp, warm rim;
  shadows+fog kept). `applyToon()` re-skins GLBs keeping map/vertex colours; RETINT tables pull cold
  pack colours (Kenney cyan grass/stone, saturated woods) onto kit.tsx's C palette; `lift` opt brightens.
- IslandBase.tsx: domed grass cap + banded strata cliffs + hanging roots; registers walkable top via
  core.useWalkable; embeds a seeded rim `Scatter`. Exported `topY(d, radius)` for prop placement.
- Water.tsx: fog-aware animated sea, foam rings per island (`islands=[x,z,r]`).
- Clouds5.tsx: merged-sphere sea + drifting puffs tinted from scene fog each frame.
- Dressing.tsx: `PROPS` catalogue (155 files), lazy `<Prop>` with `fit` height-normalization + ground
  snap + per-prop PropGuard + PROP_LIFT brightness table; `<Scatter>` seeded rim scatter clear of the
  path corridor |x|<corridorX and `avoid` zones. Default sets = round trees, stones, tufts, flowers,
  round bushes (spiky agave/dark hero props stay in PROPS, out of defaults).
- Effects5.tsx: N8AO + light bloom + vignette + SMAA; returns null under ?lite (WORLD also gates it).

## Step 1+2 done — CC0 packs fetched & optimised
- Sources: Kenney (nature/train/furniture kits, zips via kenney.nl signed download-link),
  KayKit GitHub raw (dungeon remastered GLBs self-contained; city builder + furniture bits as
  gltf+bin+shared texture), Quaternius via poly.pizza per-model GLBs.
- No gltf-transform in node_modules → wrote a small python GLB repacker (strip normal/ORM maps,
  re-encode colour maps ≤256px, rebuild buffer views). Quaternius 19 models: 32MB → ~4MB.
- public/ total ≈ 9 MB (budget 25 MB). LICENSES.md written in public/models/packs.
- Texture retint pass: citybits atlas (teal→terracotta, greys warmed), quaternius embedded
  textures (olive→leaf green). Kenney props retint at material level via RETINT tables.

## Requests to other areas
- WORLD: `ArtIslandBase` slot is currently unused (Island5 renders its own V4-parity base) —
  fine. ART density lands via `<Prop>`/`<Scatter>` imported straight from src/v5/art/Dressing
  (L01 already does). IslandBase stays available if wanted back.
- ISL-A is removing the `building_*` placements on L01 — props remain in PROPS if needed.

## TODO
- screenshot iterate 1440x900 + 390x844 (through scripts/shot.mjs only)
