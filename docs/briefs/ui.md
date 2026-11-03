Read /workspace/govinda-journey/docs/AGENTS.md first and follow it exactly. Then read src/levels/registry.ts , src/levels/types.ts and src/world/kit.tsx. Look at docs/refs/town.jpg.

YOUR JOB: UI + TYPE + BADGES POLISH. Own: src/ui/ (Overlay.tsx, styles.css, HoldToFinish.tsx, voice.ts) and new files in src/ui/.
Do NOT touch src/levels/*/ or src/world/.
1. Make the overlay feel editorial and calm (Fraunces + Inter), floating over the world with a soft legibility wash behind text
   (radial cream fade, not a box). Arrival text animates in word by word, very subtle.
2. Badges: replace the letter seals with a unique small hand-drawn style SVG emblem per level (src/ui/emblems.tsx, keyed by
   level id: lamp, stepping stone, lotus/pond, paper plane, leaf, four laptops/tree, ticket stamp, phone-arc, speech ribbon,
   hand, chalk). Earned emblem pops in with a clay "press" animation after a win (a toast-free moment: the emblem lands
   next to the badge counter). No generic star/circle icons.
3. A thin, elegant progress line along the bottom edge (desktop) showing the 11 stops as small notches; current notch is a
   tiny traveller mark; solved ones are filled. Clicking a solved notch travels there (use store.travel / goto).
4. Voice: "Say “next”" toggle must show a calm listening state; words heard appear faint for 1.5 s. Never show errors.
   Also support saying "skip" (skip to end) and "play".
5. Mobile 390x844: everything reachable with a thumb, sheets are bottom sheets, nothing overlaps the top marks.
6. A11y: focus styles, aria labels, Esc closes a sheet (returns to arrived).
Verify with node scripts/shoot.mjs "http://localhost:5190/?lite" proofs/ui and level pages. Write docs/notes/ui.md when done.
