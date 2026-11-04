# HANDOFF — V7 Devin sprint (started 11:40 IST Nov 4 2026)

15 LOCAL Devin sessions (account devin-max, Max plan; cloud sessions cannot push to GitHub: 403 from git-manager proxy, so all run on the box).
Each: worktree /workspace/gj7/<name>, branch devin/<name>, tmux gj6-<name>, log /workspace/gj7/logs/<name>.log, brief docs/briefs7/tasks.txt + COMMON.md. Final push due 14:15 IST; merge + verify + preview by 15:30 IST.

| name | model | task | status |
|---|---|---|---|
| char | swe-2-max | PLAYER CHARACTER (top priority). Govinda says the player (sr… | running |
| light | swe-2-max | CHARACTER LIGHTING. Make sure no level's lighting/tonemappin… | running |
| heli | swe-2-max | HELICOPTER. src/v5/player/Heli.tsx currently looks like a cr… | running |
| clipA | swe-2-max | COLLISION/CLIPPING AUDIT for levels L01, L02, L03. Govinda: … | running |
| clipB | swe-2-max | COLLISION/CLIPPING AUDIT for levels I01, L05, L04 (same meth… | running |
| clipC | swe-2-max | COLLISION/CLIPPING AUDIT for levels I02, L06, L07 (find prop… | running |
| clipD | swe-2-max | COLLISION/CLIPPING AUDIT for levels L08, L09 and the finale … | running |
| bridges | swe-2-max | BRIDGES AND ROPES between islands (src/v5/world/Bridge5.tsx,… | running |
| perfA | swe-2-max | PERF: DRAW CALLS. Target <150 draw calls per level view (cur… | running |
| perfB | swe-2-max | PERF: COLD TIME-TO-PLAYABLE toward 5 s. Measure cold load (f… | running |
| storyA | claude-haiku-5-5-max | STORY + TAGLINE for L01, L02, L03. Each level must make clea… | running |
| storyB | claude-haiku-5-5-max | STORY + TAGLINE for I01, L05, L04 (same brief: what he built… | running |
| storyC | claude-haiku-5-5-max | STORY + TAGLINE for I02, L06 (same brief: what he built, why… | running |
| storyD | claude-haiku-5-5-max | STORY + TAGLINE for L07, L08, L09 and the finale (same brief… | running |
| copyqa | claude-haiku-5-5-max | COPY QA + FACTS AUDIT (read-mostly). Do not edit level copy … | running |

## V8 FINAL SPRINT (launched 16:33 IST Nov 4) — rules: docs/briefs8/COMMON.md
Local Devin CLI sessions on the box (account devin-max; cloud sessions can't push → 403). No URLs; each = tmux gj8-<name>, worktree /workspace/gj8/<name>, branch devin8/<name>, log /workspace/gj8/logs/<name>.log. V7 sessions still running at 16:30 were stopped; their branches are being merged by `integrate`.
| name | model | task |
|---|---|---|
| integrate | swe-2-max | merge all V7 devin/* branches to main → docs/briefs8/INTEGRATED.md, e2e play, preview deploy |
| char | swe-2-max | full well-lit 3D player, proper arms |
| heli | swe-2-max | real 3D helicopter |
| clip | swe-2-max | ropes/props never clip islands |
| perfqa | swe-2-max | <150 draw calls, <5 s load; e2e QA from 20:00 |
| storyA | claude-haiku-5-5-max | in-world project story + taglines L01-L05, I01 |
| storyB | claude-haiku-5-5-max | same for L06-L09, I02, finale + Wispr Flow credit |
| pace | claude-haiku-5-5-max | ~2 min playthrough, snappy pacing |
Deadlines: no features after 21:00, all merged 21:45 IST, no production promote.
