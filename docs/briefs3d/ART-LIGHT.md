# ART-LIGHT: lighting, post-processing, character
Read docs/briefs3d/ART-COMMON.md first.
Scope: src/world/Effects.tsx, lights in src/world/World.tsx (lights only), src/world/Traveller.tsx, public/models/student-skin.png.
Goals:
- Lighting: a soft key light with a warm tint, a cool sky fill, contact shadows under the traveller and props, soft shadow edges. Gentle bloom only on lanterns and glowing game pieces (no blown-out whites). N8AO subtle. Tilt-shift subtle.
- Character: he must read clearly at small size with natural warm brown skin, dark near-black hair, a cream shirt/kurta, dark trousers, an indigo backpack. Current state: public/models/student-skin.png is a retinted atlas of the KayKit Rogue GLB (1024², 128-px cells; the top 4 rows are hair/face/shirt/belt, the bottom 4 rows hold arms/gloves). Remaining issue: lighter blondish hair tufts at the sides of the face. Fix those to near-black, keep the face readable (eyes visible), check at 1440×900 and 390×844. Do not swap the model.
- `?lite` must stay cheap (no AO, no bloom, no tilt-shift there).
Verify with level-check L01, L05, L09 and zoom into the character in proofs/.
