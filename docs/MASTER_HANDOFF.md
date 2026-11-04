# MASTER HANDOFF: The Journey of Govinda (Wispr Flow x Emergent, due Nov 4 2026)

## Goal (non-negotiable)
- The PROJECTS are the main event. Wispr Flow hires on how strong they look.
- Each project level must land its single best TRUE achievement: what it is, why he built it, the impressive number, and one punchy tagline.
- Every claim must be sourced in docs/FACTS.md. Be brutally honest, never inflate.
- Playthrough of about 2 minutes. Keep the polish; trim travel and filler, not project substance.
- Fix these problems from the user's review of 9eb9ac4:
  1. The player character (Govinda) has broken arms and hands, is too dark or black, and looks flat. Make him a full, nicely lit, rigged 3D character (a CC0 Quaternius, KayKit or Kenney model is fine).
  2. The helicopter is an SVG-looking block. Use a real CC0 3D helicopter model with spinning rotors.
  3. Clipping: ropes go through islands and objects intersect. Audit every level.
  4. Story: each level explains what he built and why, in-world. No boxy text panels, no cringe.
  5. Speed: draw calls under about 150 per level (AutoMerge.tsx, instancing, fewer shadows) and under 5 s to playable.
- Show a how-to-play screen first. The unlockable dog and the voxel city stay.

## Verified facts (see docs/FACTS.md)
- Ent: a 27B model sharded across 4 consumer laptops/GPUs. Its routing cut GPU memory by 53.7%. Source: https://ent-01.vercel.app/
- Alive: 240,027 Delhi places. Source: the GC-WORK11/ALive README, lines 203 and 221.
- Other shipped products: Chalk, Remote, SignWrap, Doorway, Workbench.
- Don't name the program. Never mention the confidential work confidentiality work.

## Repo and stack
- Repo: https://github.com/GC-WORK11/govinda-journey. Work goes on `main`. Fast-forward only, never force-push.
- Stack: Vite, React 18, R3F 8, drei 9, three 0.170, pnpm.
- Key code:
  - Levels: `src/levels/L01..L09`, plus `I01` and `I02`.
  - World code and AutoMerge: `src/v5/world/`.
  - UI and captions: `src/v5/ui/v5.css`.
  - Sky: `Sky5.tsx`.
- URL flags: `?qa`, `&fresh`, `&unlock`, `&finale`, `?at=<ID>`, `?nomerge`.
- Playtest bot: `node scripts/v5/play.mjs <url>`. Test at 390 and 1440 wide, and once with a fresh profile and no `?qa`.
- Last measured draw calls (9eb9ac4):
  - L04 374, L03 341, L08 302, L02 264, I02 248, L05 247
  - I01 232, L07 216, L01 168, L09 159, L06 about 125
- Last measured cold time to playable: about 7.5 s.

## Deploy
- Production: https://govinda-journey.vercel.app is still on the OLD V4+art deploy (du6o5034e).
- Last preview (9eb9ac4): https://govinda-journey-dmu83u8l4-<team>-projects.vercel.app
- To deploy: `vercel deploy` makes a preview, then `vercel promote <url>` sends it live once it's verified. Roll back to du6o5034e if anything breaks.

## Devin
- Use SWE-2 Max (10 sessions) and Haiku 5.5 Max (5 sessions).
- The V7 session list and status are in docs/HANDOFF.md (commit 7b6a9fb "HANDOFF: V7 Devin sessions").
- Each session works on its own branch. Merge into main after a playtest.
- Do NOT restart the old gj5/gj6 sessions.

## Prompt to paste into Devin or any agent
"Read docs/MASTER_HANDOFF.md and docs/FACTS.md in GC-WORK11/govinda-journey. Fix items 1-5 above. Make each project level's best true achievement the climax, and keep the playthrough to about 2 minutes. Playtest with scripts/v5/play.mjs at 390 and 1440 with no console errors. Merge to main, never force. Deploy a Vercel preview and report the URL."

## Box limits
- Disk is about 1 GB free (critical). Delete only regenerable caches. Don't touch other projects' /tmp folders.
- Use one Chrome at a time.
- The submission video (up to 3 minutes) and the form are still TODO. Building the portfolio on Emergent via Wispr Flow is Govinda's part.
