AREA: QA (scripts/v5/**). Notes: docs/notes/V5-QA.md
1. scripts/v5/play.mjs: headless puppeteer (use the same launch as /tmp/gj-liveshot.mjs: profile
   /tmp/gj-chrome-profile, the /tmp/gj-chrome.lock dir lock, one Chrome only) that opens
   /?qa (V5), clears localStorage key govinda-journey-v5, then for each island in V5_ORDER:
   walk with real key presses from ENTRY toward the obstacle, call __journey.solve[ID]() if present,
   assert useV5 done includes ID and the ability was granted, walk across the bridge, screenshot
   proofs/v5/<size>-<n>-<ID>.png. Sizes 1440x900 and 390x844 (mobile uses touch on the joystick).
   Report FAIL lines clearly, keep going after a failure.
2. Every ~15 min run it against http://localhost:5190/ and write docs/notes/V5-QA.md: per island
   PASS/FAIL, console errors, FPS estimate (requestAnimationFrame count over 3 s), and a short
   visual critique of each screenshot against the hard rules (cringe, boxy, cheap primitives).
3. File concrete bugs to the right owner in docs/notes/V5-QA.md ("PLAYER: …", "ISL-B L05: …").
You do NOT edit game code. Never kill processes. Keep disk > 1 GB.
