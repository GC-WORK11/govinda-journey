# V8 FINAL SPRINT — rules (obey strictly). Submission 23:00 IST tonight.
Goal: read docs/MASTER_HANDOFF.md. Projects are the main event: glorified but brutally honest, best true achievement highlighted, sharp technical tagline, in-world (no boxy text). Playthrough ~2 min. Only facts verified in MASTER_HANDOFF (e.g. Ent: 27B model sharded across 4 consumer laptops, routing cut GPU memory 53.7%; Alive: 240,027 Delhi places).
BRUTAL RULES:
1. Small commits/PRs. Commit message ends with `Agent: devin-<name>`.
2. Merge to main ONLY after `pnpm build` passes: `git fetch origin && git rebase origin/main && pnpm build && git push origin HEAD:main` (fast-forward). On reject: rebase and retry. NEVER force-push. Never break main.
3. Also push your branch: git push origin HEAD:devin8/<name>.
4. Stuck >20 min on anything: ship what works, move on.
5. No new features after 21:00 IST — only polish/fixes. Everything merged by 21:45 IST. Then stop.
6. Do NOT run `vercel promote` / production. `vercel deploy` (preview) of main is fine.
7. Box is shared and small (15 GB RAM, low disk): at most ONE vite dev server per session on your own port, kill it when done; never run more than one Chrome; use scripts/v5/play.mjs with the shared lock; never delete other folders/projects; keep >=1 GB disk free; no `pnpm install` (node_modules is symlinked).
8. Stay inside your task's files. Don't ask questions; work autonomously.
9. WAIT FOR INTEGRATION: unless you are "integrate", first poll every 3 min until origin/main contains docs/briefs8/INTEGRATED.md (max 40 min; after that proceed anyway), then `git rebase origin/main` before editing.
10. Final: write docs/briefs8/RESULT-<name>.md (what changed, verified how, what's left) and merge it to main.
