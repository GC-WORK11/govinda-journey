# Asset packs — sources & licenses

All packs are CC0 (public domain). Only the files used in-game are kept on disk.

## nature/ — Kenney, "Nature Kit"
- Source: https://kenney.nl/assets/nature-kit
- License: CC0 1.0 Universal (https://creativecommons.org/publicdomain/zero/1.0/)

## train/ — Kenney, "Train Kit"
- Source: https://kenney.nl/assets/train-kit
- License: CC0 1.0 Universal

## furniture/ — Kenney, "Furniture Kit"
- Source: https://kenney.nl/assets/furniture-kit
- License: CC0 1.0 Universal

## dungeon/ — KayKit (Kay Lousberg), "Dungeon Remastered"
- Source: https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0
  (itch.io: https://kaylousberg.itch.io/kaykit-dungeon-remastered)
- License: CC0 1.0 Universal

## city/ — KayKit (Kay Lousberg), "City Builder Bits"
- Source: https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0
  (itch.io: https://kaylousberg.itch.io/city-builder-bits)
- License: CC0 1.0 Universal

## home/ — KayKit (Kay Lousberg), "Furniture Bits"
- Source: https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0
  (itch.io: https://kaylousberg.itch.io/furniture-bits)
- License: CC0 1.0 Universal

## quaternius/ — Quaternius, "Ultimate Stylized Nature" / "Ultimate Nature"
- Source: https://poly.pizza/u/Quaternius (models mirrored from https://quaternius.com)
- License: CC0 1.0 Universal
- Optimisation: normal/ORM maps stripped, colour maps re-encoded ≤ 256 px.

## citykit/ — Kenney, "City Kit Commercial" (+ helicopter)
- Source: https://kenney.nl/assets/city-kit-commercial
- License: CC0 1.0 Universal
- GLBs share the `Textures/colormap.png` atlas sidecar (must stay adjacent).
- All .glb EXT_meshopt_compression encoded (tools/glbmeshopt.mjs, round-trip verified).
- `helicopter.glb` — "Helicopter" by kazuma via poly.pizza (https://poly.pizza/m/EQJ2MECUbx), CC0.

## pet/ (public/models/pet/dog.glb) — Quaternius, "Animated Animals: Husky"
- Source: https://poly.pizza/m/wcWiuEqwzq (mirrored from quaternius.com Animated Animals)
- License: CC0 1.0 Universal
- Optimisation: duplicate `AnimalArmature|*` clip entries stripped (12 unique clips kept),
  then EXT_meshopt_compression via tools/glbmeshopt.mjs (every view round-trip verified;
  needs MeshoptDecoder wired into the loader — see docs/notes/V6-ART.md).

## Existing
- public/models/student.glb — KayKit Adventurers Rogue (CC0), already in repo.
