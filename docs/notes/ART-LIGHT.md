# ART-LIGHT — lighting / FX / character pass

Owns `src/world/Effects.tsx`, lights in `src/world/World.tsx`, `src/world/Traveller.tsx`,
`public/models/student-skin.png`.

- Skin atlas: cell (1,1) was left light tan (`#c5a479`) by the earlier retint — it maps to the
  hairline wisps, sidelocks, nape and under-chin band of `Rogue_Head` (verified by rasterizing
  the head UVs out of student.glb: only the head samples that cell). Filled it with cell (1,0)'s
  near-black gradient so all hair reads one dark tone; face cell (0,1) warm brown untouched,
  eyes stay dark/visible. Software-rendered front/3/4/back to confirm.
- Effects: N8AO 2.2→1.7, aoRadius 1.7→1.3, falloff 0.9→1.0 — tighter, subtler contact darkening.
  Bloom unchanged in intent (mipmapBlur, threshold 1.0 → lantern glass and pulsing glowMat
  pieces only, no blown whites), smoothing 0.2. TiltShift2 per coordinator: blur 0.55→0.15,
  taper 0.42→0.35, samples 16→10 — only a light edge falloff, bridges/top of frame stay sharp.
  Vignette + SMAA kept. `?lite` still mounts no effects.
- World.tsx: the unlock flare pointLight already matches the brief (warm `#ffc27a`, brief
  flash, decays) — left as is. Key sun / cool fill live in Atmosphere.tsx (ART-ENV's file),
  already warm `#ffe2b6` + cool `#dfe9e4`; soft edges come from `shadows="soft"` (PCFSoft).
  Traveller keeps its blob contact shadow (works in lite too).

Verified: `tsc --noEmit -p .` passes; head + body renders checked offline. Level-check not
re-run after the last tune (time-boxed by V5 handoff); earlier proofs showed no issues.
