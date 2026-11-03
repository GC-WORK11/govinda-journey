Read /workspace/govinda-journey/docs/AGENTS.md first and follow it exactly. Then read src/levels/registry.ts , src/levels/types.ts and src/world/kit.tsx. Look at docs/refs/town.jpg.

YOUR JOB: QA + FULL PLAY-THROUGH HARNESS. Own: scripts/playthrough.mjs and docs/notes/qa.md only. Do not edit src/.
Write scripts/playthrough.mjs: opens http://localhost:5190/?qa&lite (base URL as argv), clears localStorage, clicks
"Begin the walk", then for EVERY level in order (window.__journey.levels): click "Play", run scripts/qa/<ID>.mjs if present
(else fall back to window.__journey.win()), wait for the panel, screenshot proofs/play-<viewport>-<NN>-<ID>.png, click
"Walk on", wait for arrival (phase === 'arrived'). At the end screenshot the finale panel. Run at 1440x900 and 390x844.
Report per level: real QA script used or fallback, won or not, console errors. Also test "Skip to the end" from a fresh
start and that a page reload keeps progress (localStorage). IMPORTANT box rules: copy the shared-browser lock block from the top of scripts/level-check.mjs (the /tmp/gj-chrome.lock
mkdir loop + unlock on exit) into playthrough.mjs so only one Chrome runs at a time. Use ONE browser for both viewports,
generous timeouts (page.setDefaultTimeout(120000)), and give up a level after 90 s (record it, move on). Run the full
playthrough at most TWICE total. Append the results table to docs/notes/qa.md, and for each failing level append a
precise bug note to docs/notes/<ID>.md (what step, what you saw). Don't fix other agents' code.
