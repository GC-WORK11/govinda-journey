# ART-ENV: environment, sky, clouds, depth
Read docs/briefs3d/ART-COMMON.md first.
Scope: src/world/sky.ts, src/world/Atmosphere.tsx, src/world/Lanterns.tsx, cloud/sky components in src/world/ (not Effects.tsx, not levels/).
Goals:
- Sky: a soft painterly gradient per time of day (day 0–3, golden 4–6, dusk 7–9, night finale 10). Dusk must not cast a heavy red/orange tint on the islands (L08 was too red). Night should be a deep warm indigo, still readable.
- Clouds: replace lumpy grey blobs with layered, soft clay clouds: a cloud sea below the islands plus a few slow drifting puffs at varied depths. In the finale, clouds must never sit in the middle of the frame as a big grey mass.
- Depth: gentle aerial perspective (distant islands hazier and bluer), a subtle horizon glow, faint birds or drifting motes only if they are restrained.
- Wow moments that must stay working: cloud-sweep opening, day→golden→night with lanterns, finale pull-back showing the whole lit path.
Verify with level-check L01, L05, L08, L09 and look at proofs/*-island.png and *-after.png.
