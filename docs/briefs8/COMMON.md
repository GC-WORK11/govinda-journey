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

## VOICE DIRECTION (top priority, from Govinda at 6:02 PM IST)
"It should be my voice, my journey and my story, explained in my voice while the user plays."
- All in-game story text (line, story, captions, signs, finale) is Govinda speaking in the first person: "I built…", "I wanted…". Keep it short, honest and conversational, like a voice note. No narrator voice, no marketing copy, no third person.
- Each level is one beat of his real journey: what I built, why I built it, and the best true result.
- Use only facts verified in docs/MASTER_HANDOFF.md, docs/FACTS.md and the current registry. Do not invent facts (no ages, dates or numbers that aren't sourced). Never mention the NDA work or name fellowship programs.
- Optional voice-over: when a level's story beat triggers, if `public/voice/<levelId>.mp3` exists (e.g. L05.mp3), play it and show the text as captions. If the file is missing, show the text only. Check with a HEAD fetch or a guarded `new Audio()` with an onerror handler, with no console errors and no 404 noise in the playtest. Respect mute, start audio only after a user gesture, and stop it on level exit.
- The script Govinda will record is in docs/briefs8/VOICE_LINES.md. Keep the on-screen captions matching those lines.
