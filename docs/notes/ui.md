# UI / type / badges polish — agent notes

Owns `src/ui/`. What changed:

- **Editorial overlay** (`Overlay.tsx`, `styles.css`): Fraunces titles + Inter UI, blocks float over the world
  on a radial cream wash (`::before` radial-gradient, no box). Arrival + intro text animates in word by word
  (`Words` helper, ~40–110 ms stagger, slight blur+rise; `aria-label` on the parent so SRs hear the whole line).
- **Emblems** (`emblems.tsx`): one hand-drawn SVG per level id — L01 lamp, L02 stepping stones, I01 lotus,
  L03 paper plane, L04 leaf, L05 laptops-as-tree, I02 ticket stamp, L06 phone+arcs, L07 speech ribbon,
  L08 hand, L09 chalk. Loose strokes, round caps, one accent-tinted detail per drawing (from `palette.accent`).
  Badges popover uses them in squircle seals; unearned are dimmed. On win, the new emblem presses in next to
  the badge counter (`stamp` keyframes, holds ~3.8 s, `role="status"`).
- **Progress line** (`.path`, desktop only, hidden ≤760 px): 11 notches on a hairline rail; solved = filled
  blob dot, current = tiny `Walker` figure with a slow bob. Solved stops are buttons → `store.travel(i)`
  (walks if adjacent-forward, glides otherwise); unsolved stops are disabled.
- **Voice** (`voice.ts` + Overlay): toggle shows "Listening" with a slow-pulse terracotta dot; each heard
  phrase shows faint for 1.5 s (`heardLife` keyframes, then state clears). Commands: next/continue/go/walk/
  start/begin/open/read → next action; `play` → opens the game; `skip` → skip to end. Errors swallowed.
- **Mobile 390×844**: sheets and the badges popover are bottom sheets; skip link hidden; voice + badges stay
  in the top-right; progress line hidden; nothing overlaps the top marks.
- **A11y**: `:focus-visible` ink outline everywhere, `aria-label`s on icon-only + toggle controls,
  `aria-pressed`/`aria-expanded`/`aria-current`, `role="dialog"` on sheets, Esc closes badges then sheets
  (back to `arrived`). Reduced motion kills all animation via the blanket rule.
- `HoldToFinish`: touch hardening (no select/callout/context menu while holding).

Verified: `npx tsc -p . --noEmit` clean; `node scripts/level-check.mjs L01` → PASS (WON desktop+mobile,
0 console problems); screenshots in `proofs/ui-*`, `proofs/ui2-*` at 1440×900 and 390×844 — intro, arrival,
game sheet, earned press, panel, badges sheet all checked on both sizes. The dev box was at load ~200 so
`shoot.mjs` timed out on Chrome launch; equivalent shots were taken via a /tmp puppeteer script with longer
timeouts (`--disable-webgl` for overlay-only frames + level-check PNGs for real-world frames).

Rough edges: voice can't be exercised headlessly (no mic); the hand emblem is stylised — readable at badge
size but the loosest of the set.
