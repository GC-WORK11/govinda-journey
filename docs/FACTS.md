# FACTS: truth audit of on-screen copy

Audited 2026-11-04 against registry commit ec83944. Scope: every field in `src/levels/registry.ts`, plus captions, island signs, finale and How-to-play copy in other files (listed at the end for their owners).

- **verified yes**: a public source states the claim.
- **n/a**: game copy (instruction, scene text, metaphor or label). It makes no claim about real life.

## Sources checked

| id | source | checked |
|---|---|---|
| S1 | https://govinda-01.vercel.app/Govinda_Chauhan_ML_Systems_Resume.pdf | résumé text (200) |
| S2 | https://govinda-01.vercel.app/ | portfolio JS bundle: owner copy and contact links (200) |
| S3 | https://api.github.com/users/GC-WORK11 and /repos/GC-WORK11/* | profile (no X handle, no email), repo created and pushed dates |
| S4 | https://github.com/GC-WORK11/ALive | README (200) |
| S5 | https://github.com/GC-WORK11/remote | README (200) |
| S6 | https://github.com/GC-WORK11/sign-wrap | README (200) |
| S7 | https://github.com/GC-WORK11/wispr-wrap | README (200) |
| S8 | https://github.com/GC-WORK11/doorway | README and topics (200) |
| S9 | https://ent-01.vercel.app/ | page text (200) |
| S10 | https://active-parameter-runtime.govindach-iitp.chatgpt.site/working-set-routing-paper.pdf | paper text (200) |
| S11 | https://www.wemakedevs.org/blogs/announcing-environmental-hacks and https://www.wemakedevs.org/aws/env/projects/all | hackathon dates: Oct 8 to 11, 2026, in-person day at DTU on Oct 10 |
| S12 | https://www.linkedin.com/posts/wemakedevs_nohandschallenge-activity-7516842274123706368-705h | uses #NoHandsChallenge |
| S13 | https://ceohunt.vercel.app/ , https://flow-pitch.vercel.app , https://delegators-workbench.vercel.app , https://doorway-ide.vercel.app/ , https://delhi-is-alive.vercel.app , https://remote-01.vercel.app , https://sign-flow-eight.vercel.app | HTTP 200, page titles, bundles |

Not used as sources: the Devpost "NoHands" page (a different project), and alive-engine (a different Tauri/Rust project with no README).

## Registry copy: src/levels/registry.ts

| claim | file:line | source URL | verified | note |
|---|---|---|---|---|
| Résumé is at this URL | src/levels/registry.ts:8 | https://govinda-01.vercel.app/Govinda_Chauhan_ML_Systems_Resume.pdf (S1) | yes | 200, text read |
| Contact: email | src/levels/registry.ts:10 | S1 header; S2 contact block | yes | same address in both |
| Contact: GitHub | src/levels/registry.ts:11 | https://github.com/GC-WORK11 | yes | 200, name Govinda Chauhan |
| Contact: LinkedIn | src/levels/registry.ts:12 | https://in.linkedin.com/in/govinda-flow | yes | linked from S1 and S2; LinkedIn answers 999 to scripts, so the page itself was not fetched |
| Contact: Résumé | src/levels/registry.ts:13 | RESUME (line 8) | yes | same file |
| Contact: X (was x.com/Govinda_00000) | removed | none | n/a (removed) | removed from CONTACT (src/levels/registry.ts:9-13), not on screen. No source ties this handle to the owner. S3 has no X handle. S2 links x.com/Doorway_harness |

### L01 (The first step)

| claim | file:line | source URL | verified | note |
|---|---|---|---|---|
| IIT Patna (place) | src/levels/registry.ts:18 | S1 | yes | "IIT Patna · 2023" lost the year: no source gives 2023 |
| The first step (title) | src/levels/registry.ts:18 | n/a | n/a | label |
| I study Computer Science and Data Analytics at IIT Patna, and I build software and ML systems. | src/levels/registry.ts:19 | S1 | yes | "IIT Patna — BS, Computer Science & Data Analytics"; "I build software and ML systems" |
| Light the lamps to wake the campus. / Tap each lamp to light it | src/levels/registry.ts:20 | n/a | n/a | instruction |
| I am an undergraduate at IIT Patna. For four years I have built things people can open. | src/levels/registry.ts:21 | S1 | yes | "CS undergraduate at IIT Patna"; "For four years I have built things people can open" |
| This world is a game about my projects. Each project island opens after a short game that shows how the project works. | src/levels/registry.ts:22 | https://github.com/GC-WORK11/govinda-journey | yes | describes the game itself. "Every island is a real project" was removed |
| Résumé (link) | src/levels/registry.ts:23 | RESUME | yes | 200 |
| Arrival (badge) | src/levels/registry.ts:23 | n/a | n/a | label |
| I love sharing what I learn. | src/levels/registry.ts:21 (story); src/levels/L01/Obstacle.tsx (spoken when the traveller crosses the wall) | S1 header: "I build software and ML systems, and I love sharing what I learn." (https://govinda-01.vercel.app/Govinda_Chauhan_ML_Systems_Resume.pdf, fetched 2026-11-04) | yes | the motive for the L01 story. "For four years I have built things people can open." is the row above |

### L02 (The closed gates)

| claim | file:line | source URL | verified | note |
|---|---|---|---|---|
| The closed gates (place) | src/levels/registry.ts:27 | n/a | n/a | label |
| Letters (title) | src/levels/registry.ts:27 | n/a | n/a | replaces "Rejections", which implied personal rejections with no source |
| Some gates stay shut. Five letters can still become stepping stones. | src/levels/registry.ts:28 | n/a | n/a | game metaphor. Replaces an unsourced "Some doors said no. I kept the letters." |
| Fold each letter into a stone and cross the gap. / Drag each letter into the stream | src/levels/registry.ts:29 | n/a | n/a | instruction |
| Five letters, five stones. Each closed gate becomes a step up. | src/levels/registry.ts:30 | n/a | n/a | game copy. Replaces an unsourced application and rejection story |
| tech: empty | src/levels/registry.ts:31 | n/a | n/a | the unsourced "habit" claim was removed |
| Stepping stones (badge) | src/levels/registry.ts:32 | n/a | n/a | label |

### I01 (Stillness)

| claim | file:line | source URL | verified | note |
|---|---|---|---|---|
| In between (place) / Stillness (title) | src/levels/registry.ts:36 | n/a | n/a | labels |
| A quiet bench by the water. Sit for a while. | src/levels/registry.ts:37 | n/a | n/a | game scene. Replaces an unsourced personal routine |
| Hold to breathe, three slow times. / Hold to breathe in, let go | src/levels/registry.ts:38 | n/a | n/a | instruction |
| A few slow breaths, then on to the next island. | src/levels/registry.ts:39 | n/a | n/a | game copy. Replaces "Meditation is how I reset" (unsourced) |
| tech: empty | src/levels/registry.ts:40 | n/a | n/a | |
| Stillness (badge) | src/levels/registry.ts:41 | n/a | n/a | label |

### L03 (Small websites)

| claim | file:line | source URL | verified | note |
|---|---|---|---|---|
| Weekends (place) | src/levels/registry.ts:45 | S1 section "PRODUCTS & WEEKEND BUILDS" | yes | |
| Small websites (title) | src/levels/registry.ts:45 | n/a | n/a | replaces "First websites", which implied these were the first sites |
| Small web products, built on weekends and shipped online. | src/levels/registry.ts:46 | S1 SUMMARY ("weekend web products"); the four demo URLs below (200) | yes | replaces "I shipped small sites on weekends to see if anyone cared" (the motive is unsourced) |
| Snap the pieces of a page into place. / Drag the pieces onto the frame | src/levels/registry.ts:47 | n/a | n/a | instruction |
| CEO Hunt, Flow Pitch, Delegators Workbench and Doorway IDE are weekend builds you can open today. | src/levels/registry.ts:48 | S1 "PRODUCTS & WEEKEND BUILDS"; S13 (all 200) | yes | "Each one took a weekend, so the idea could meet real people fast" removed (unsourced motive) |
| React front ends, shipped on Vercel. | src/levels/registry.ts:49 | S13: react-dom and createRoot in the bundles of CEO Hunt, Flow Pitch, Workbench and Doorway IDE; *.vercel.app hosting | yes | |
| Doorway, a desktop app, is a cockpit for visible terminal agents, with git worktrees and review flows. | src/levels/registry.ts:49 | S8 description ("Local-first desktop cockpit for visible terminal agents, git worktrees, and review/merge workflows"); topics include electron | yes | replaces "grew into a cockpit ... side by side" |
| CEO Hunt, Flow Pitch, Delegators Workbench, Doorway IDE (links) | src/levels/registry.ts:51-54 | the four demo URLs above | yes | all 200. "Workbench" and "Doorway" labels changed to the destinations' names |
| Shipper (badge) | src/levels/registry.ts:55 | n/a | n/a | label |

### L03 project lines (spoken in-world; registry tech line)

| claim | file:line | source URL | verified | note |
|---|---|---|---|---|
| CEO Hunt: a calm meeting ground for founders, investors, and operators. | src/levels/L03/Obstacle.tsx (PROJECTS, spoken when the page is picked up) | S1 "PRODUCTS & WEEKEND BUILDS": "CEO Hunt — A calm meeting ground for founders, investors, and operators."; https://ceohunt.vercel.app/ (200) | yes | the résumé also lists React and Postgres for it; not on screen |
| Flow Pitch: agent workflows, redesigned for a phone screen. | src/levels/L03/Obstacle.tsx (PROJECTS) | S1: "Flow Pitch — Agent workflows redesigned for a phone screen, shipped in a weekend as a live pitch site."; https://flow-pitch.vercel.app (200) | yes | "shipped in a weekend" is covered by "CEO Hunt, Flow Pitch, Delegators Workbench and Doorway IDE are weekend builds you can open today." (L03 table) |
| Delegators Workbench turns plans into finished documents. | src/levels/L03/Obstacle.tsx (PROJECTS) | S1: "Delegators — … Its Workbench side turns plans into finished documents."; https://delegators-workbench.vercel.app (200) | yes | the résumé describes the Workbench side of the Delegators product; the link is that side on its own domain (see "Delegators Workbench (link label, changed from ..." in the finale table) |
| Doorway IDE: several AI models side by side, from one thin page. | src/levels/registry.ts:49 (tech; spoken on the solve caption) | S1: "Doorway IDE — Talk to several AI models side by side from one thin page, no heavy install."; https://doorway-ide.vercel.app/ (200) | yes | the web app. The desktop app Doorway is a separate product (see "Doorway IDE (link label, changed from ..." in the finale table) and is no longer on this level |
| All four are React front ends, shipped on Vercel. | src/levels/registry.ts:49 (tech) | the row "React front ends, shipped on Vercel." (S13 bundles of CEO Hunt, Flow Pitch, Workbench and Doorway IDE; *.vercel.app hosting) | yes | "All four" is the same four sites |
| CEO Hunt, Flow Pitch, Delegators Workbench and Doorway IDE are weekend builds you can open today. | src/levels/registry.ts:48 (story); src/levels/L03/Obstacle.tsx (spoken near the weekend bench) | the row "CEO Hunt, Flow Pitch, Delegators Workbench and Doorway IDE are weekend builds you can open today." (S1, S13) | yes | the same claim as the registry row, now also spoken in-world |

### L05 (Ent)

| claim | file:line | source URL | verified | note |
|---|---|---|---|---|
| Aug – Sep 2026 (place) | src/levels/registry.ts:59 | S9: runs dated Aug 14, Sep 13 and Sep 16, 2026 | yes | |
| Ent (title) | src/levels/registry.ts:59 | n/a | n/a | name |
| Four ordinary laptops, one 27B model, over Wi-Fi. | src/levels/registry.ts:60 | S9: "Four laptops. Three operating systems. One 27-billion-parameter model — over Wi-Fi, on camera." and "Ordinary laptops pooled into one machine" | yes | replaces "No GPU cluster. Four laptops on home Wi-Fi." (the GPU claim has no source) |
| Split the model so every laptop can hold its share. / Drag each block onto a laptop | src/levels/registry.ts:61 | n/a | n/a | instruction. Replaces "split the model's layers" (S9 says shards) |
| Ent splits one large model across ordinary laptops. | src/levels/registry.ts:62 | S9 ("runs it as if it were one machine"); S2 Ent entry | yes | |
| In the third run, four laptops on Linux, Windows and Mac served a 27B model together over Wi-Fi. | src/levels/registry.ts:62 | S9 RUN 03, Sep 16: Qwen3.8-27B (27 billion parameters) served by four laptops, Linux, Windows and Mac, over wireless | yes | |
| Written in Rust. | src/levels/registry.ts:63 | S1 ENT entry ("Rust · 23k LOC") | yes | the Ent source is not public |
| Each laptop runs its share in a sandbox and never gives up more than 60% of its memory. | src/levels/registry.ts:63 | S2 Ent entry ("never gives up more than 60% of its memory"); S1 ("sandboxes and wipe audits") | yes | replaces the unsourced "layers placed by memory" and "activations pass between them" |
| Ent (link) | src/levels/registry.ts:64-67 | https://ent-01.vercel.app | yes | 200 |
| Paper (link) | src/levels/registry.ts:66 | S10 | yes | 200. The document calls itself a working paper, not peer reviewed. Label kept as "Paper" (a QA hook matches it) |
| Shared weight (badge) | src/levels/registry.ts:67 | n/a | n/a | label |

### L04 (Alive)

| claim | file:line | source URL | verified | note |
|---|---|---|---|---|
| Delhi · Oct 2026 (place) | src/levels/registry.ts:71 | S3: ALive created 2026-10-10, pushed 2026-10-16; S1 "ALive OCT 2026" | yes | |
| ALive (title) | src/levels/registry.ts:71 | https://github.com/GC-WORK11/ALive (repo name); S4 README; S1; S2 | yes | changed from "Alive". The live app's page title says "Alive" (https://delhi-is-alive.vercel.app/app/). The repo, README, résumé and portfolio all write "ALive" |
| Built for the AWS × WeMakeDevs Environmental Hacks. | src/levels/registry.ts:72 | S4: "Built for the AWS × WeMakeDevs Environmental Hacks 2026" | yes | "Four days at" and "demoed at DTU" removed. The hackathon ran Oct 8 to 11 (S11), but no source says ALive was demoed there |
| Live, street-level air for Delhi-NCR. | src/levels/registry.ts:72 | S4 | yes | |
| Place the sensors and clear the smog. / Drag the sensors onto the glowing spots | src/levels/registry.ts:73 | n/a | n/a | instruction |
| ALive shows the air at the exact spot you stand on in Delhi-NCR, and routes where you breathe less smoke. It runs on AWS. | src/levels/registry.ts:74 | S4 README and repo description | yes | "launched on Oct 11" removed (no source) |
| The air field is rebuilt every 15 minutes from ground monitors and a model grid. | src/levels/registry.ts:75 | S4 air-field diagram: "Rebuilt every 15 minutes" from CPCB, DPCC, OpenAQ and WAQI monitors plus a CAMS model grid | yes | "ground monitors", not "government monitors": OpenAQ and WAQI are not government sources |
| Search covers over 240,000 Delhi places. | src/levels/registry.ts:75 | 240,027 figure, exact locations: https://raw.githubusercontent.com/GC-WORK11/ALive/main/README.md line 203 ("240,027 Delhi + 19,004 NCR places", search index) and line 221 ("240,027-place Delhi gazetteer"); line 50 says "240,000-place Delhi index". Data file in the same repo: server/data/delhi-gazetteer.json (https://github.com/GC-WORK11/ALive/blob/main/server/data/delhi-gazetteer.json, 22,988,013 bytes; entry count not re-counted) | yes | "over 240,000" is true of 240,027. The earlier "240k" was supported; now written as "over 240,000" |
| Live (link) | src/levels/registry.ts:76-79 | https://delhi-is-alive.vercel.app | yes | 200 (app at /app/) |
| GitHub (link) | src/levels/registry.ts:78 | https://github.com/GC-WORK11/ALive | yes | 200 |
| Clear air (badge) | src/levels/registry.ts:79 | n/a | n/a | label |

### I02 (On the road)

| claim | file:line | source URL | verified | note |
|---|---|---|---|---|
| Between stops (place) / On the road (title) | src/levels/registry.ts:83 | n/a | n/a | labels. Replaces "Across India", which had no source |
| Off the keyboard, I like to travel and show people around. | src/levels/registry.ts:84 | S1 ("Off the keyboard: traveller, happy showing people around") | yes | replaces "Trains, new cities, strangers who turned into friends" |
| Ride the train to the next stop. / Hold to drive the train | src/levels/registry.ts:85 | n/a | n/a | instruction |
| A short ride and a calm stop, then on to the next island. | src/levels/registry.ts:86 | n/a | n/a | game copy. Replaces "I travel whenever I can ... New places reset how I see a problem" |
| tech: empty | src/levels/registry.ts:87 | n/a | n/a | |
| Traveller (badge) | src/levels/registry.ts:88 | S1 ("traveller") | yes | |

### L06 (Remote)

| claim | file:line | source URL | verified | note |
|---|---|---|---|---|
| Oct 2026 (place) | src/levels/registry.ts:92 | S3: remote created 2026-10-11, pushed 2026-10-15; S1 "Remote OCT 2026" | yes | |
| Remote (title) | src/levels/registry.ts:92 | n/a | n/a | name |
| Coding agents run on my laptop, and I steer them from my phone. | src/levels/registry.ts:93 | S2: "which runs the coding agents on my laptop from my phone"; S5 | yes | replaces "My agents kept working while I was away from the desk" |
| Send a task from the phone and watch the laptop do it. / Tap a task on the phone | src/levels/registry.ts:94 | n/a | n/a | instruction |
| Remote lets me drive the coding agents on my laptop from my phone, over Wi-Fi or Tailscale. | src/levels/registry.ts:95 | S5 ("Wi-Fi or Tailscale"); S2 | yes | "wherever I am" removed: it needs Wi-Fi or Tailscale |
| A zero-dependency C++20 daemon runs on the laptop and an Expo app runs on the phone. | src/levels/registry.ts:96 | S5: "zero-dep C++20" daemon, mobile/ Expo app; GitHub topics cpp20, expo | yes | |
| Prompts go to the agent, and text, screenshots and approvals stream back. | src/levels/registry.ts:96 | S5 "A turn, end to end" | yes | replaces "Commands stream to the agent" |
| Live (link) | src/levels/registry.ts:97 | https://remote-01.vercel.app | yes | 200; title "Remote — code from your phone" |
| GitHub (link) | src/levels/registry.ts:97 | https://github.com/GC-WORK11/remote | yes | 200 |
| Long reach (badge) | src/levels/registry.ts:97 | n/a | n/a | label |

### L07 (Wispr Wrap)

| claim | file:line | source URL | verified | note |
|---|---|---|---|---|
| Oct 22, 2026 (place) | src/levels/registry.ts:101 | S3: wispr-wrap created 2026-10-22; first commit the same day | yes | |
| Wispr Wrap (title) | src/levels/registry.ts:101 | n/a | n/a | name |
| I talk into my phone and the words land on my Linux laptop. | src/levels/registry.ts:102 | S7: "there is no Wispr Flow for Linux — so the phone becomes the mic" | yes | |
| Say a line, or type it, and send it across. / Tap the words | src/levels/registry.ts:103 | n/a | n/a | instruction |
| Wispr Wrap: dictate on your phone with Wispr Flow, and the text types at your cursor on Linux. | src/levels/registry.ts:104 | S7 ("dictate with Wispr Flow on the phone, and the text types itself at your laptop cursor") | yes | "on an Android phone" removed: S7 says any modern browser; the Android app is optional |
| Finished text from the phone is sent to a small service on the laptop, which types it into whatever window has focus. | src/levels/registry.ts:105 | S7 (daemon on :8741; types into any focused app) | yes | |
| GitHub (link) | src/levels/registry.ts:106 | https://github.com/GC-WORK11/wispr-wrap | yes | 200; no demo exists |
| No keys (badge) | src/levels/registry.ts:106 | n/a | n/a | label |

### L08 (Sign Flow)

| claim | file:line | source URL | verified | note |
|---|---|---|---|---|
| Oct 27 – 31, 2026 (place) | src/levels/registry.ts:110 | S3: sign-wrap created 2026-10-27, pushed 2026-10-31 | yes | |
| Sign-Flow (title) | src/levels/registry.ts:110 | https://github.com/GC-WORK11/sign-wrap (README "# Sign-Flow"); https://sign-flow-eight.vercel.app/ (title "Sign-Flow — type and control your laptop without touching it") | yes | changed from "Sign Flow". The repo folder is named sign-wrap |
| Teach the laptop your own hand signs. | src/levels/registry.ts:111 | S6 ("Teach your phone camera a few hand signs of your own"); S13 site description | yes | |
| Match each sign to what it does. / Tap the hand that matches | src/levels/registry.ts:112 | n/a | n/a | instruction |
| Sign-Flow lets you record your own hand signs on a phone camera, then use them to type or control the laptop. | src/levels/registry.ts:113 | S6 (three takes; Text and Control modes) | yes | |
| Built for the #NoHandsChallenge. | src/levels/registry.ts:113 | S6 credits ("WeMakeDevs × Wispr Flow 'No Hands' challenge"); S12 uses #NoHandsChallenge | yes | the unrelated Devpost "NoHands" project is not this one |
| The phone reads 21 points on your hand, and the laptop matches each sign against the takes you recorded. | src/levels/registry.ts:114 | S6 ("Only 21 landmark points per hand go to the laptop"; "shape match and banded DTW") | yes | "a small model learns the signs" removed: S6 describes matching, not learning |
| Each sign types a phrase or runs an action. | src/levels/registry.ts:114 | S6 (Text mode types the phrase; Control mode runs the action) | yes | |
| Live (link) | src/levels/registry.ts:115 | https://sign-flow-eight.vercel.app | yes | 200 |
| GitHub (link) | src/levels/registry.ts:115 | https://github.com/GC-WORK11/sign-wrap | yes | 200 |
| No hands (badge) | src/levels/registry.ts:115 | n/a | n/a | label |

### L09 (finale)

| claim | file:line | source URL | verified | note |
|---|---|---|---|---|
| Now (place) | src/levels/registry.ts:119 | n/a | n/a | label |
| The schoolhouse (title) | src/levels/registry.ts:119 | n/a | n/a | game label. Replaces "Chalk", which has no public source (see open items) |
| Right now I’m building ALive and Remote. | src/levels/registry.ts:120 | S2 ("Right now I’m building", followed by ALive and Remote) | yes | replaces "What I’m building next: a messaging app for Indian schools", which has no source |
| Open the school gate. / Tap the right answer | src/levels/registry.ts:121 | n/a | n/a | instruction |
| ALive is an air map of Delhi, street by street. | src/levels/registry.ts:122 | S2 ("an air map of Delhi, street by street") | yes | |
| Remote runs the coding agents on my laptop from my phone. | src/levels/registry.ts:122 | S2; S5 | yes | |
| Each project island links to its repo or a live demo. | src/levels/registry.ts:123 | every project island row in the table below | yes | |
| Right now (badge) | src/levels/registry.ts:124 | n/a | n/a | replaces "What’s next" |

## Repo and demo links for project islands (for ISL agents)

| island | project | repo | demo | HTTP check |
|---|---|---|---|---|
| L03 | CEO Hunt | none found under GC-WORK11 | https://ceohunt.vercel.app/ | 200 |
| L03 | Flow Pitch | none found | https://flow-pitch.vercel.app | 200 |
| L03 | Delegators Workbench | none found | https://delegators-workbench.vercel.app | 200 |
| L03 | Doorway IDE (web) | https://github.com/GC-WORK11/doorway is the desktop app, a separate product | https://doorway-ide.vercel.app/ | 200 |
| L04 | ALive | https://github.com/GC-WORK11/ALive | https://delhi-is-alive.vercel.app | 200 |
| L05 | Ent | none public | https://ent-01.vercel.app; working paper https://active-parameter-runtime.govindach-iitp.chatgpt.site/working-set-routing-paper.pdf | 200; 200 |
| L06 | Remote | https://github.com/GC-WORK11/remote | https://remote-01.vercel.app | 200; 200 |
| L07 | Wispr Wrap | https://github.com/GC-WORK11/wispr-wrap | none | 200 (repo) |
| L08 | Sign-Flow | https://github.com/GC-WORK11/sign-wrap | https://sign-flow-eight.vercel.app | 200; 200 |

## Finale: dates and names (checked 2026-11-04, registry commit 3b230a7)

What the finale shows: the L09 eyebrow and line, the project list (title, place, links), the stack words, the contact links and the Résumé button. Every date and name it can show is listed here. Fixed in this pass: "Alive" to "ALive", "Sign Flow" to "Sign-Flow", and the link labels "Workbench" and "Doorway" to "Delegators Workbench" and "Doorway IDE". No date was cut: all five project dates have a public source.

| item | file:line | source URL | verified | note |
|---|---|---|---|---|
| Ent, "Aug – Sep 2026" (date) | src/levels/registry.ts:59 (place); src/v5/ui/Finale.tsx:44 | https://ent-01.vercel.app/ (runs dated August 14, September 13 and September 16, 2026) | yes | the three dated runs. The portfolio card says "Ongoing · 2026" (https://govinda-01.vercel.app/) |
| Ent (name) | src/levels/registry.ts:59 (title); src/v5/ui/Finale.tsx:43 | https://ent-01.vercel.app/ (nav "Ent"); résumé "Project ENT" (https://govinda-01.vercel.app/Govinda_Chauhan_ML_Systems_Resume.pdf) | yes | the site's title uses "ENT". Kept "Ent" to match its nav |
| ALive, "Delhi · Oct 2026" (date) | src/levels/registry.ts:71 (place) | https://api.github.com/repos/GC-WORK11/ALive: created 2026-10-10, pushed 2026-10-16 | yes | month only. The hackathon window was Oct 8 to 11, 2026 (https://www.wemakedevs.org/blogs/announcing-environmental-hacks) |
| ALive (spelling) | src/levels/registry.ts:71 (title, changed from "Alive"), 74, 120, 122 | https://github.com/GC-WORK11/ALive (repo and README); résumé; https://govinda-01.vercel.app/ | yes | the repo, README, résumé and portfolio all write "ALive". The live app's page title says "Alive" (https://delhi-is-alive.vercel.app/app/) |
| Remote, "Oct 2026" (date) | src/levels/registry.ts:92 (place) | https://api.github.com/repos/GC-WORK11/remote: created 2026-10-11, pushed 2026-10-15; earliest listed commit 2026-10-05 | yes | month only. Created 05:11 on Oct 12 in IST, still October |
| Remote (name) | src/levels/registry.ts:92 (title) | https://github.com/GC-WORK11/remote (README "# Remote"); https://remote-01.vercel.app/ (title "Remote — code from your phone") | yes | |
| Wispr Wrap, "Oct 22, 2026" (date) | src/levels/registry.ts:101 (place) | https://api.github.com/repos/GC-WORK11/wispr-wrap: created 2026-10-22; first listed commit 2026-10-22 "Wispr Wrap — phone-to-Linux input bridge" | yes | created 16:33 UTC, which is 22:03 on Oct 22 in IST |
| Wispr Wrap (name) | src/levels/registry.ts:101 (title) | https://github.com/GC-WORK11/wispr-wrap (README "# ✳ Wispr Wrap") | yes | |
| Sign-Flow, "Oct 27 – 31, 2026" (date) | src/levels/registry.ts:110 (place) | https://api.github.com/repos/GC-WORK11/sign-wrap: created 2026-10-27, first commit 2026-10-27 "Initial public release", last commit 2026-10-31 | yes | these are public repo dates. The label is the public window, not a claim about earlier private work. The README says Sign-Flow grew out of Wispr Wrap (created Oct 22) |
| Sign-Flow (spelling) | src/levels/registry.ts:110 (title, changed from "Sign Flow"), 113 | https://github.com/GC-WORK11/sign-wrap (README "# Sign-Flow"); https://sign-flow-eight.vercel.app/ (title "Sign-Flow — type and control your laptop without touching it") | yes | the repo folder is named sign-wrap |
| Now (L09 place; eyebrow) | src/levels/registry.ts:119 (place); src/v5/ui/Finale.tsx:33 | relative to the visit, 2026-11-04 | n/a | relative label |
| The schoolhouse (L09 title; eyebrow) | src/levels/registry.ts:119 (title); src/v5/ui/Finale.tsx:33 | n/a | n/a | game label, not a name claim |
| "Right now I’m building ALive and Remote." | src/levels/registry.ts:120; src/v5/ui/Finale.tsx:35 | https://govinda-01.vercel.app/ ("Right now I’m building", followed by ALive and Remote) | yes | |
| Govinda Chauhan (name) | src/v5/ui/Finale.tsx:34 | https://github.com/GC-WORK11 (profile name "Govinda Chauhan"); résumé header; https://govinda-01.vercel.app/ | yes | |
| CEO Hunt (link label) | src/levels/registry.ts:51 | https://ceohunt.vercel.app/ (title "CEO HUNT | The Complete Ecosystem"); résumé "CEO Hunt" | yes | the site writes it in capitals |
| Flow Pitch (link label) | src/levels/registry.ts:52 | https://flow-pitch.vercel.app/ (title "Flow | Orchestrate Intelligence"); résumé "Flow Pitch" | yes | |
| Delegators Workbench (link label, changed from "Workbench") | src/levels/registry.ts:53 | https://delegators-workbench.vercel.app/ (title "Delegators Workbench") | yes | |
| Doorway IDE (link label, changed from "Doorway") | src/levels/registry.ts:54 | https://doorway-ide.vercel.app/ (title "Doorway - The Orchestration Layer"); résumé "Doorway IDE" | yes | the desktop app is a separate product: https://github.com/GC-WORK11/doorway |
| Ent (link label) | src/levels/registry.ts:65 | https://ent-01.vercel.app | yes | |
| Paper (link label) | src/levels/registry.ts:66 | https://active-parameter-runtime.govindach-iitp.chatgpt.site/working-set-routing-paper.pdf | yes | |
| Live, GitHub (link labels) | src/levels/registry.ts:77, 78, 97, 106, 115 | the demo and repo URLs in the repo table above | yes | |
| React · Vercel (stack, L03) | src/v5/ui/Finale.tsx:22 | the four L03 demos (react-dom in the bundles, *.vercel.app hosting) | yes | shown only when facts.ts marks it verified |
| Rust (stack, L05) | src/v5/ui/Finale.tsx:23 | résumé ENT entry ("Rust · 23k LOC") | yes | |
| C++20 · Expo (stack, L06) | src/v5/ui/Finale.tsx:24 | https://github.com/GC-WORK11/remote (README: zero-dependency C++20 daemon, Expo app) | yes | |
| Contact labels and URLs (Email, GitHub, LinkedIn, Résumé) | src/levels/registry.ts:10-13; src/v5/ui/Finale.tsx:63-66 | mailto address in résumé and portfolio; https://github.com/GC-WORK11; https://in.linkedin.com/in/govinda-flow (linked from résumé and portfolio); RESUME (200) | yes | LinkedIn answers 999 to scripts, so the page itself was not fetched |
| Weekends (L03 place; finale project list) | src/levels/registry.ts:45 (place); src/v5/ui/Finale.tsx:44 | résumé section "PRODUCTS & WEEKEND BUILDS" and "weekend web products" (https://govinda-01.vercel.app/Govinda_Chauhan_ML_Systems_Resume.pdf) | yes | not a calendar date: it names the weekend builds |
| Small websites (L03 title; finale project list) | src/levels/registry.ts:45 (title); src/v5/ui/Finale.tsx:43 | n/a | n/a | game label for the four weekend sites: CEO Hunt, Flow Pitch, Delegators Workbench, Doorway IDE |
| Project list includes L01 ("The first step", place "IIT Patna") | src/v5/ui/Finale.tsx:16 | committed PROJECTS list: L03, L05, L04, L06, L07, L08 (Finale.tsx:16); résumé for the place "IIT Patna — BS, Computer Science & Data Analytics" | yes | fixed in committed code: L01 is no longer listed |

## Other on-screen copy (owners act on these)

| claim | file:line | source URL | verified | note |
|---|---|---|---|---|
| Ribbon year "2023" for L01 and L02 | src/v5/ui/Ribbon.tsx:22-25 (rendered labels; core.ts WHEN is not rendered) | none | n/a (removed) | coordinator 06:20 IST: year ticks removed from Ribbon.tsx (YEARS = []);  the 2023 label still shows. Ribbon.tsx is a WORLD file this pass does not change or commit. No source for 2023. Patch for WORLD in docs/notes/V6-FACTS.md. The rail positions (Ribbon.tsx:12-14) are also unsourced. Owner decision (open item 3) |
| Ribbon year "2024" for L03 and I01 | src/v5/ui/Ribbon.tsx:22-25 | none | n/a (removed) | coordinator 06:20 IST: year ticks removed from Ribbon.tsx (YEARS = []);  the 2024 label still shows (same WORLD file, not changed here). No source for 2024. Patch for WORLD in docs/notes/V6-FACTS.md. Owner decision (open item 3) |
| Ribbon year "2025" tick | src/v5/ui/Ribbon.tsx:22-25 | S3 (GitHub account created 2025-01-21); S2 (AETHER card "Architecture notes · 2025") | n/a (removed) | coordinator 06:20 IST: year ticks removed from Ribbon.tsx (YEARS = []);  the 2025 axis label sits between I01 and L05, so it implies I01's year, which has no source. Part of open item 3 |
| Ribbon year "2026" (the 2026 tick that I02 falls under) | src/v5/ui/Ribbon.tsx:22-25 | S3 (repos created 2026-10-10 to 2026-10-27); S9 (Ent runs in 2026) | n/a (removed) | coordinator 06:20 IST: year ticks removed from Ribbon.tsx (YEARS = []);  the 2026 axis label spans L05 to L09 (sourced years) but also covers I02, whose year has no source (rail position Ribbon.tsx:13, T=2026.8). Owner decision (open item 3) |
| Island month labels in core.ts WHEN ("Aug 2026", "Oct 2026", "Nov 2026", "2026") | src/v5/core.ts:22-23 | n/a | n/a | not rendered: WHEN is exported; its only other src reference is a comment (Ribbon.tsx:10) |
| "Each project island is a short game about something real I built" | src/v5/ui/HowTo.tsx:48-49 | the six project islands, L03, L04, L05, L06, L07, L08 (committed PROJECTS list, Finale.tsx:16; repo and demo table above) | yes | fixed in committed code. The old wording said every island, which is false for I01, I02 and L02 |
| Finale project list includes L01 (Résumé link and tech) | src/v5/ui/Finale.tsx:16 | n/a | yes | duplicate of the L01 row above; resolved in the committed PROJECTS list |
| facts.ts VERIFIED (tech and story gate) | src/v5/ui/facts.ts:15-17 | this file | yes | populated in committed code for L01, L03, L04, L05, L06, L07, L08, L09 |
| "Give each laptop only the shards it can hold." | src/levels/L05/Game.tsx:159 | S9 ("Two Windows legs serving real shards over LAN and Tailscale") | yes | "layers" replaced with "shards" |
| "one 27B model" (L05 caption) | src/levels/L05/Game.tsx:160 | S9 (RUN 03: Qwen3.8-27B, 27 billion parameters) | yes | the GB labels and totals that were at Game.tsx:47, 160 and 169 are removed. Slab index labels L1 to L12 remain (game index, not a claim). The LAPTOPS caps stay as game logic and are not shown as numbers |
| "AQI" sign label (no reading shown) | src/levels/L04/street.v5.tsx:315 | S4 (ALive shows AQI at a point) | yes | the invented readings 232, 187, 168, 151 (L04/Obstacle.tsx:33-35) are no longer drawn: aqiTagTex prints the label only (street.v5.tsx:318 removed). The array stays as code only |
| "Three quick questions about plants." and "Tap send to start the quiz." (replaced the Helper line) | src/levels/L09/Game.tsx:123, 134 | the quiz has 3 questions (Game.tsx:13-17) | yes | the claim that a helper writes tests is removed; no public source found for that product (open item 2). The avatar emoji is removed too |
| Quiz facts: plants make oxygen; plants need light from the sun; leaves catch sunlight | src/levels/L09/Game.tsx:14-16 | https://en.wikipedia.org/wiki/Photosynthesis (checked 2026-11-04): "releases oxygen as a byproduct of water splitting"; "convert light energy—typically from sunlight"; chlorophyll "abundant in leaf cells" | yes | general science, not a claim about the author or the projects |
| "every 15 min" pill | src/levels/L04/Game.tsx:142 | S4 | yes | |
| Pennant labels "Workbench" and "Doorway" | src/levels/L03/Game.tsx:20-21 | S13 | yes | short names of the same two products. Kept as pennants; the link labels now use the full names. Owner optional |
| Canvas text "Sign-Flow" (plaza board), "teach the laptop", "your own hand signs" | src/levels/L08/plaza.v5.tsx:191, 194-195 | S6 (README "# Sign-Flow"; "Teach your phone camera a few hand signs of your own") | yes | fixed: the board now reads "Sign-Flow" (was "Sign Flow"). The other two phrases already match S6 |
| Finale STACK: "React · Vercel", "Rust", "C++20 · Expo" | src/v5/ui/Finale.tsx:21-25 | S13 bundles, S1, S5 | yes | gated by facts.ts |
| Finale name "Govinda Chauhan" and the Résumé button | src/v5/ui/Finale.tsx:34, 66 | S1 | yes | |
| Other labels, prompts, captions, hints, aria text and control text (L01 to L09, I01, I02, HowTo, Chrome, Glyphs) | src/levels/*/Obstacle.tsx, Game.tsx, *.v5.tsx; src/v5/ui/HowTo.tsx:52-55; src/v5/ui/Chrome.tsx:55 | n/a | n/a | game copy with no factual claim. Examples: "The bell rings out over the rooftops." (L09), "A small rail line running past four towns" (I02), "Deploy" (L03), sample task labels (L06 Game.tsx:8-10) |

## Removed or softened in this audit (registry commit ec83944)

Each of these had no source:
- L01: "In 2023 I started a BS", "Hybrid classes, one laptop, a lot of time to build", "Classes were mostly online", "Every island is a real project".
- L02: "Some doors said no. I kept the letters.", the application and rejection story, "No code here, just a habit".
- I01: "After a hard week I sit by the water", "Meditation is how I reset".
- L03: "to see if anyone cared", "Each one took a weekend, so the idea could meet real people fast", "grew into a cockpit ... side by side".
- L04: "Four days", "demoed at DTU", "launched on Oct 11", "240k" (kept as "over 240,000").
- L05: "No GPU cluster", "home Wi-Fi", "layers placed by memory", "activations pass between them", "paper reports 53.7% less GPU memory" (see open items).
- I02: "Across India", "Trains, new cities, strangers who turned into friends", "I travel whenever I can".
- L06: "My agents kept working while I was away from the desk", "wherever I am", "Commands stream".
- L07: "on an Android phone".
- L08: "a small model learns the signs".
- L09: the Chalk title and story, "a messaging app for Indian schools", "bots a teacher can ask for a test", the "What's next" badge.
- CONTACT: the X link.
- Names: "Alive" to "ALive" (L04 title); "Sign Flow" to "Sign-Flow" (L08 title); link labels "Workbench" to "Delegators Workbench" and "Doorway" to "Doorway IDE" (L03).

## Open items for the owner

1. **X contact.** No source ties x.com/Govinda_00000 to the owner. The portfolio links x.com/Doorway_harness, and the GitHub profile has no X handle. Confirm the handle, then add it back with its source.
2. **Chalk.** No repo, demo, résumé line or portfolio mention. Removed. Re-add with a public source.
3. **Ribbon time scale (open).** The 2023, 2024, 2025 and 2026 labels still show (src/v5/ui/Ribbon.tsx, a WORLD file this pass does not change or commit). The rail positions for L01 to I01 still encode approximate years (Ribbon.tsx:12-14), including I02 at 2026.8, so the 2025 and 2026 marks sit on an unsourced scale. Patch for WORLD in docs/notes/V6-FACTS.md (empty the YEARS array). Owner decision: that patch, or source the dates.
4. **53.7%.** The working paper (S10) says the strongest static run cut allocated VRAM from 12.533 GB to 5.798 GB and kept 80.65% of an exploratory quality score. The résumé says "bit-exact outputs", which applies only to the paging branch. The number is not on screen now.
5. **In-world numbers.** Resolved in this pass: the L05 GB labels and "layers" wording, the L04 AQI digits, and the L09 Helper demo. Also resolved: the plaza canvas spelling (src/levels/L08/plaza.v5.tsx:191).
6. **Code gates.** Resolved in committed code: the How-to-play line, the Finale project list (L01 removed), and facts.ts VERIFIED.
7. **LinkedIn.** Scripts get 999 from linkedin.com, so the link is confirmed only by S1 and S2.
