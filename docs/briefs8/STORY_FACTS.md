# STORY_FACTS: Govinda's real story, for first-person level text
Researched Nov 4 2026. Sources: résumé PDF https://govinda-01.vercel.app/Govinda_Chauhan_ML_Systems_Resume.pdf (RES), GitHub GC-WORK11 READMEs + repo dates (GH), docs/FACTS.md, docs/MASTER_HANDOFF.md.
RULE: use only these facts. Anything marked UNVERIFIED must NOT appear as a number or claim on screen. Write in first person per VOICE DIRECTION in COMMON.md. Projects are the main event.

## Who I am (verified)
- Govinda Chauhan, Delhi. BS Computer Science & Data Analytics, IIT Patna (RES). "I build software and ML systems, and I love sharing what I learn." (RES)
- "For four years I have built things people can open" (RES). "My AI agents operate at SOTA level, and together we make a solid team." (RES)
- Wrote a six-part inference-engineering curriculum with a 157-item hands-on gauntlet (RES).

## Timeline (verified by repo creation dates / sources)
- 2025-05/06: first public repos (C-Extension, A-Portfolio) (GH)
- 2025-09 to 2026-01: IYF camp / quiz / library sites, live on Vercel (GH)
- 2026-01/02: FLOW, FLOW-AI agent platform (GH)
- 2026-05: Doorway, Kairo, VideoUnit, AETHER, Chimera (GH)
- 2026-10-08..11: AWS × WeMakeDevs Environmental Hacks (in-person day at DTU Oct 10) → built ALive (FACTS S11, RES)
- 2026-10-11: Remote. 2026-10-18: Chalk, Sign-Flow. 2026-10-22: Wispr Wrap. 2026-10-27: SignWrap (GH)
- 2026-11-03: this game (GH)

## Projects (what · why · best TRUE fact · source)
1. **Ent** — run big AI models on a pool of ordinary laptops instead of renting cloud GPUs. Why: GPUs are expensive; laptops already exist. Best: a 27B model served over home Wi-Fi across 4 consumer laptops, 26/26 tokens at 50–61 ms; Rust, 23k LOC; sandboxes + wipe audits keep volunteers' files private. Sources: RES, https://ent-01.vercel.app/
2. **Working-set routing (Ent research)** — page MoE experts in/out exactly. Best: cut memory 53.7% on a 6.78B model, bit-exact outputs, on 2× Tesla T4. Source: RES + paper (FACTS S10). Tagline: "Same answers, bit for bit. Half the memory."
3. **ALive** — live street-level air for Delhi-NCR; routes priced in micrograms breathed, petrol and minutes; real GPS nav. Why: Delhi air; built at AWS × WeMakeDevs Environmental Hacks. Best: 240,000-place Delhi index (240,027 per handoff); runs on AWS ECS Fargate, CloudFront, DynamoDB. Sources: RES, github.com/GC-WORK11/ALive, https://delhi-is-alive.vercel.app
   - USER COUNT: **UNVERIFIED.** README has an operator dashboard counting users (anonymous), but no published number anywhere. Do NOT state a user count. Safe line: "Real people used it to route around smoke" only if Govinda confirms; otherwise "built for the people breathing it".
4. **Remote** — drive your own laptop from your phone: zero-dependency C++20 daemon + Expo app for coding agents. Best: 0.3 ms click, 15.8 ms screenshot round-trips (p50). Sources: RES, github.com/GC-WORK11/remote, https://remote-01.vercel.app
5. **Wispr Wrap** — "there is no Wispr Flow for Linux — so the phone becomes the mic": dictate on phone, it types at your laptop cursor over USB/Wi-Fi/anywhere. Best: stdlib Python, zero deps, ~20 MB RSS, no build step. Source: github.com/GC-WORK11/wispr-wrap. Hackathon link (WeMakeDevs Wispr) UNVERIFIED in README.
6. **Sign-Flow / SignWrap** — type and control your laptop without touching it, with your own hand signs taught to the camera. Best: ~0.1 s from sign to keystroke (median 107 ms); video stays on device. Sources: github.com/GC-WORK11/sign-wrap, https://sign-flow-eight.vercel.app
7. **Chalk** — agentic AI messaging for Indian schools on WhatsApp + Slack. Best: flagship demo, teacher goes live → 2 real student clients join (413/527 ms) → parent DM in 292 ms; cold load 348–472 ms. Source: github.com/GC-WORK11/chalk
8. **Doorway** — local-first cockpit for terminal AI agents, git worktrees and review/merge, so agent work is auditable. Source: RES, github.com/GC-WORK11/doorway. No metric.
9. **Workbench / Delegators** — rent a coding agent by the session; Workbench turns plans into finished documents. Source: RES, https://delegators-workbench.vercel.app. No metric.
10. Also real (résumé/GitHub, no metrics): Kairo (scores install commands before an agent runs them, Rust/MCP), VideoUnit (tests AI-generated video), AETHER (physics from video), CEO Hunt, Flow Pitch, Remote-OS.
- **"Find"**: no repo or source found. UNVERIFIED, do not use.

## Never on screen
Invented user counts or metrics; any confidential/NDA work; fellowship program names.
