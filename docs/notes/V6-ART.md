# V6 — ART (status)

DONE: pet dog (Quaternius Husky, CC0, meshopt, 12 clips) + Kenney City Kit Commercial (22 buildings) + CC0 helicopter, all in public/models; PROPS catalogue extended; licenses recorded.
PENDING: none — awaiting PET/L06 agents to consume. Loader MUST get a MeshoptDecoder (snippet below) before any meshopt GLB renders.
VERIFY: playthrough at /?qa&fresh (1440x900 + 390x844) — dog follows player after L03 (PET owns), L06 reads as a small modern city, no missing-GLB console errors.

## Assets delivered

### public/models/pet/dog.glb — 675 KB, Quaternius Husky (CC0)
- 1 skinned mesh, 1 skin, vertex colours (no textures), ~850 meshopt bufferViews.
- Animation clips (exact names — use verbatim):
  - `Idle` — main idle loop
  - `Idle_2`, `Idle_2_HeadLow` — alternate idles
  - `Walk`, `Gallop`, `Gallop_Jump` — locomotion (Gallop = run)
  - `Eating` — head-down crouch; **use as the sit/rest substitute** (no literal `Sit` clip in the source)
  - `Jump_ToIdle`, `Idle_HitReact_Left`, `Idle_HitReact_Right`, `Attack`, `Death` — extras
  - Duplicate `AnimalArmature|*` clip entries were stripped; names above are the survivors.
- Suggested mapping for PET: idle→`Idle`, run→`Gallop` (walk→`Walk`), sit→`Eating` (pause on last frame or loop gently).
- Quaternius dogs are small (~1 m); scale ~0.8–1.0 to sit beside the student.

### public/models/packs/citykit/ — 636 KB total, L06 modern city
- Kenney City Kit Commercial (CC0): building-a..e, building-skyscraper-a..e, low-detail-building-a..h, detail-awning(-wide), detail-parasol-a.
- All share `Textures/colormap.png` — keep the sidecar; palette is warm terracotta + slate blue-grey (already clay-adjacent; the `#61cb8b` green patches are the only cold hue).
- `helicopter.glb` — kazuma's CC0 low-poly helicopter, single mesh, no anims; rotate the `rotor`-ish nodes in code or just bob/spin whole model.
- PROPS names registered in src/v5/art/Dressing.tsx: `city_building_a..e`, `city_skyscraper_a..e`, `city_low_a..h`, `city_awning`, `city_awning_wide`, `city_parasol`, `helicopter`.

## REQUIRED loader wiring (PET + anyone loading these GLBs)

Every new GLB uses EXT_meshopt_compression (extensionsRequired). Without a decoder
the loader throws `setMeshoptDecoder must be called`. One-time wiring, before first load:

```ts
import { useGLTF } from '@react-three/drei'
import { MeshoptDecoder } from 'meshoptimizer'   // already in node_modules
useGLTF.setMeshoptDecoder(MeshoptDecoder)
```

(`Prop`/`Scatter` in Dressing.tsx don't wire this yet — whoever renders citykit props first should add the same two lines; meshoptimizer is already an installed dep of drei.)

## Compression notes
- tools/glbmeshopt.mjs — hand-rolled EXT_meshopt_compression writer (meshoptimizer npm, already installed). Encodes every accessor bufferView (INDICES for index data — TRIANGLES permutes bytes; ATTRIBUTES otherwise), keeps degenerate/tiny views raw, and round-trip-decodes every view, refusing to write on any byte mismatch. dog.glb 927 KB → 675 KB; citykit 1.4 MB → 636 KB.

## Verification URLs (for QA — no browser runs by agents per Govinda's rule)
- `/?qa&fresh&at=L06` — L06 city buildings/helicopter once ISL-E places them; check for meshopt load errors in console.
- `/?qa&fresh` full playthrough after L03 — dog appears/follows (PET owns); check `pet/dog.glb` loads (decoder wired).
- `/?qa&fresh&at=L09&unlock&finale` — finale still clean after dressing bake (user's piecesGeo edit in Dressing.tsx).
