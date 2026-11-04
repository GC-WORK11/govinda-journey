# RESULT: copyqa (V7 copy QA + facts audit)

Branch `devin/copyqa`. Audited copy at base `8208028` (V7 briefs commit). FACTS source: `docs/FACTS.md` (audit 2026-11-04). Level copy (`src/levels/**`) was NOT edited; the four story sessions own it. Status: WIP, final push by 14:15 IST.

Scope read: `src/levels/registry.ts`, the V5 path (`src/v5/ui/*`, `src/v5/player/Controls.tsx`, `src/v5/player/Heli.tsx` prompt label, `src/levels/<ID>/Obstacle.tsx` and `*.v5.tsx`, `Diorama.tsx`), `index.html`, and the v4 legacy path (`?v4`: `src/ui/Overlay.tsx`, `src/levels/*/Game.tsx` and `Play.tsx`). The default route (`/`, `App.tsx`) renders `World5` only; `?v4` renders the old overlay. Dev-only harnesses (`dev.v5.tsx`, `preview.v5.tsx`, `bench.tsx`) and `?sandbox` are listed at the end and are not visitor copy.

## 0. Changes made (outside src/levels)

| file:line | before | after | why |
|---|---|---|---|
| `index.html:9` (meta description, shown in search and link previews) | "Three years of building, one path. A small playable world by Govinda Chauhan." | "A small playable world by Govinda Chauhan." | "Three years" has no FACTS line, and it contradicts the sourced "For four years I have built things people can open" (FACTS.md:47, `registry.ts:21`). Removal only. |
| `src/ui/Overlay.tsx:83` (v4 overlay, reachable only with `?v4`) | "Every island is something I built. Play it to open it." | "Play each island to open it." | False claim: L02, I01, I02 and L09 are not projects. FACTS.md:48 removed "Every island is a real project" from the registry for the same reason. |

No typos found in visible copy (checked with a misspelling pattern list and by reading every string below). No exclamation marks in visible copy.

## 1. Scan results

| check | result |
|---|---|
| Exclamation marks in visible text | None. (The only `!` hits in `src` are TypeScript non-null assertions.) |
| Emoji | None. Text glyphs only: `↗` on the Ent card links (`src/levels/L05/card.v5.tsx:48`), `×` close buttons, `✓` in v4-only `L06/Game.tsx:42,150,268`. |
| "Level complete" | None. |
| Cringe | Hashtag "#NoHandsChallenge" (`registry.ts:113`, story only, v4 path; not on the V5 route). "a builder would know" (`L09/Obstacle.tsx:303`), a wink, mild. |
| Jargon on the V5 route | "C++20", "Expo", "daemon" (`registry.ts:96`), "Rust", "Tailscale" (`registry.ts:95`), "model grid" and "air field" (`registry.ts:75`), "27B" (`registry.ts:60`), "React front ends", "Vercel", "git worktrees", "terminal agents" (`registry.ts:49`), "Shared power" and "Long reach" ability names (`Glyphs.tsx:64-65`). Sourced, but dense for a non-technical visitor. |
| HUD / confidential work (confidentiality) / Mergetober / fellowship names in visible copy | None. Code-only: `PromptHUD` (`src/levels/L06/dev.v5.tsx:53`, `L07/dev.v5.tsx:53`), `.hud` class (`src/levels/L03/preview.v5.tsx:216,224`, `L04/preview.v5.tsx`, `I02/preview.v5.tsx`), comment in `src/ui/styles.css:188`. Dev harness or v4 CSS, not on screen. Consider renaming for hygiene. |
| Numbers on screen | Each number is listed in the table below with its FACTS line. Invented AQI values 232, 187, 168, 151 (`src/levels/L04/Obstacle.tsx:33-35`) are NOT drawn: the tags render only the word "AQI" (`src/levels/L04/street.v5.tsx:315`). Keep it that way. |

## 2. Table: every user-visible string on the default route (V5)

Columns: surface, `file:line`, string, FACTS verdict (quoted), flag. "n/a" means game copy or label, which FACTS does not treat as a claim. Registry rows use `registry.ts` line numbers.

### Shell and global UI

| surface | file:line | string | FACTS verdict | flag |
|---|---|---|---|---|
| page title | `index.html:8` | The Journey of Govinda | n/a (name) | ok |
| meta description | `index.html:9` | (was "Three years of building, one path. ...") | unsourced "three years" | FIXED, see section 0 |
| wordmark | `src/v5/ui/Chrome.tsx:55` | Govinda, "01 / 11", "The Journey" | n/a (structure) | ok |
| intro eyebrow | `src/v5/ui/HowTo.tsx:47` | The journey of Govinda | n/a | lowercase "journey" vs "The Journey" elsewhere (minor) |
| intro line | `src/v5/ui/HowTo.tsx:48-49` | A chain of little islands, one per chapter. Each project island is a short game about something real I built. Finish it to open the way on. | FACTS.md:48 "This world is a game about my projects. Each project island opens after a short game" (yes); no FACTS row quotes HowTo itself | partly sourced; "one per chapter" is n/a structure |
| keys (desktop) | `HowTo.tsx:53` | WASD or arrows to walk · Space to hop · E to use · drag the sky to look | n/a (controls; match `input.ts`) | ok |
| keys (touch) | `HowTo.tsx:52` | Stick to walk · hop and use buttons · drag the sky to look | n/a | "Stick" is game-speak (joystick) |
| begin | `HowTo.tsx:55` | Tap anywhere to begin / Press any key to begin | n/a | ok |
| controls aria | `src/v5/player/Controls.tsx:148,161` | Descend, Ascend, Jump | n/a (a11y) | ok |
| ability names (tooltip and aria) | `src/v5/ui/Glyphs.tsx:64-65` | Climb, Build, Shared power, Sense, Long reach, Voice, Sign | n/a labels | "Shared power" and "Long reach" are abstract |
| interact prompt | `src/v5/player/Controls.tsx:136` | interactable label (per island, below) | see per island | |

### L01 The first step (campus, arrival island)

| surface | file:line | string | FACTS verdict | flag |
|---|---|---|---|---|
| caption eyebrow (arrival) | `registry.ts:18` | IIT Patna | FACTS.md:43 "IIT Patna (place)": yes (S1 "IIT Patna — BS, Computer Science & Data Analytics") | the year was dropped on purpose |
| caption line (arrival) | `registry.ts:19` | I study Computer Science and Data Analytics at IIT Patna, and I build software and ML systems. | FACTS.md:45 yes (S1) | ok |
| caption after solve (tech, 6 s) | `registry.ts:22` | This world is a game about my projects. Each project island opens after a short game that shows how the project works. | FACTS.md:48 yes (self-describing; repo link) | ok |
| caption eyebrow after solve | `registry.ts:23`, `Chrome.tsx:37` | IIT Patna · Arrival | badge n/a | ok |
| pill hint | `src/levels/L01/Obstacle.tsx:32,66` | Use WASD or the stick to walk | n/a instruction | "stick" |
| pill hint | `L01/Obstacle.tsx:67` | Jump over the low wall | n/a | ok |
| pill hint | `L01/Obstacle.tsx:68` | Sit at the laptop under the tree | n/a | ok |
| interact label | `L01/Obstacle.tsx:41` | sit at the laptop | n/a | lowercase label style |
| not on V5 route | `registry.ts:20-21` | task "Light the lamps to wake the campus.", hint "Tap each lamp to light it", story "For four years I have built things people can open." | story: FACTS.md:47 yes | story and task are never shown in V5 for L01 |

### L02 Letters (gates, not a project)

| surface | file:line | string | FACTS verdict | flag |
|---|---|---|---|---|
| eyebrow | `registry.ts:27` | The closed gates | n/a metaphor | ok |
| caption line | `registry.ts:28` | Some gates stay shut. Five letters can still become stepping stones. | FACTS.md:58 n/a (game metaphor) | ok |
| caption after solve | `Chrome.tsx:36` | falls back to the line (tech is empty) | n/a | ok |
| badge after solve | `registry.ts:32` | The closed gates · Stepping stones | n/a | ok |
| hint | `L02/Obstacle.tsx:154,195` | Pick up the five letters | n/a | ok |
| hint | `L02/Obstacle.tsx:196` | `${placed} of 5 letters` | n/a | ok |
| hint | `L02/Obstacle.tsx:197` | Climb the stone steps | n/a | ok |
| v4 only | `L02/Game.tsx:16` | letters read "No", "Not this time", "No", "Not now", "No" | rejection story, removed by FACTS.md:57-58 | FLAG (legacy path only) |

### I01 Stillness (interlude)

| surface | file:line | string | FACTS verdict | flag |
|---|---|---|---|---|
| eyebrow | `registry.ts:36` | In between | n/a | ok |
| caption line | `registry.ts:37` | A quiet bench by the water. Sit for a while. | FACTS.md:69 n/a (game scene) | ok |
| badge after solve | `registry.ts:41` | In between · Stillness | n/a | ok |
| interact label | `I01/Obstacle.tsx:42` | sit for a moment | n/a | ok |
| station hint | `I01/Obstacle.tsx:146` | sit a while | n/a | ok |
| v4 only | `registry.ts:38`, `I01/Game.tsx:87,97-99,206` | Hold to breathe, three slow times. · A little longer · Breathe out / Let go / Breathe in · Hold to breathe in, let go to breathe out. | FACTS.md:70 n/a | v4 only; the V5 island has no breathing mechanic |

### L03 Small websites (project)

| surface | file:line | string | FACTS verdict | flag |
|---|---|---|---|---|
| eyebrow | `registry.ts:45` | Weekends | FACTS.md:79 yes (S1 "PRODUCTS & WEEKEND BUILDS") | ok |
| caption line | `registry.ts:46` | Small web products, built on weekends and shipped online. | FACTS.md:81 yes (S1 "weekend web products"; four demo URLs 200) | ok |
| caption after solve, and finale tech | `registry.ts:49` | React front ends, shipped on Vercel. Doorway, a desktop app, is a cockpit for visible terminal agents, with git worktrees and review flows. | FACTS.md:84-85 yes (S13 react-dom; S8 description) | FLAG: "Doorway, a desktop app" describes the desktop repo. The "Doorway IDE" link (`registry.ts:54`) is the separate web demo (FACTS.md:196 "a separate product"). A visitor will read them as the same thing. |
| badge after solve | `registry.ts:55` | Weekends · Shipper | n/a label | "Shipper" is slang (minor) |
| finale links | `registry.ts:51-54` | CEO Hunt, Flow Pitch, Delegators Workbench, Doorway IDE | FACTS.md:83 yes, all 200 | ok |
| interact label | `L03/Obstacle.tsx:147` | climb the handholds | n/a | lowercase |
| interact label | `L03/Obstacle.tsx:163` | take a page | n/a | ok |
| interact label | `L03/Obstacle.tsx:176` | lay a page in the gap | n/a | ok |
| caption | `L03/Obstacle.tsx:150` | the holds are too high — I can’t reach them | n/a | lowercase captions here, sentence case elsewhere |
| caption | `L03/Obstacle.tsx:180` | a loose page would bridge this gap | n/a | lowercase |
| in-world hint (canvas label) | `L03/Obstacle.tsx:340-349` | handholds · climb · pages for the gaps · a page gap · lay the page · the weekend bench | n/a | ok |
| comment only | `L03/Obstacle.tsx:3` | "First websites" | (stale title) | code only |
| v4 only | `L03/Game.tsx:132-133,156,162` | Now tap its matching slot. · Drag the pieces into the page. · Pull the lever. · Shipped — four little sites went out. · Go · Deploy | FACTS.md:83 for the four sites | v4 only |

### L05 Ent (project, Aug to Sep 2026)

| surface | file:line | string | FACTS verdict | flag |
|---|---|---|---|---|
| eyebrow | `registry.ts:59` | Aug – Sep 2026 | FACTS.md:93 yes (S9 runs dated Aug 14, Sep 13, Sep 16) | ok |
| caption line | `registry.ts:60` | Four ordinary laptops, one 27B model, over Wi-Fi. | FACTS.md:95 yes (S9 "Four laptops... One 27-billion-parameter model — over Wi-Fi") | ok |
| caption after solve (tech) | `registry.ts:63` | Written in Rust. Each laptop runs its share in a sandbox and never gives up more than 60% of its memory. | FACTS.md:99-100 yes (S1 "Rust · 23k LOC"; S2 "never gives up more than 60% of its memory") | ok |
| badge | `registry.ts:67` | Shared weight | n/a label | abstract |
| Ent card (Read about Ent) title | `card.v5.tsx:43`, `registry.ts:60` | the line above | FACTS.md:95 | ok |
| Ent card story | `card.v5.tsx:44`, `registry.ts:62` | Ent splits one large model across ordinary laptops. In the third run, four laptops on Linux, Windows and Mac served a 27B model together over Wi-Fi. | FACTS.md:97-98 yes (S9 RUN 03, Sep 16; S2) | ok |
| Ent card tech | `card.v5.tsx:45` | (tech line above) | FACTS.md:99-100 yes | ok |
| Ent card links | `card.v5.tsx:48`, `registry.ts:64-67` | Ent ↗ · Paper ↗ | FACTS.md:101-102 yes (200) | "Paper" label kept: a QA hook matches it (FACTS.md:102) |
| Ent card eyebrow | `card.v5.tsx:42` | Aug – Sep 2026 · Ent | sourced | ok |
| interact label | `L05/Obstacle.tsx:103,135` | Pick up the slab · Set the slab down | n/a | ok |
| interact label | `L05/Obstacle.tsx:278,283` | Lay a plank · A plank would span this gap | n/a | ok |
| interact label | `L05/Obstacle.tsx:289,295,313,331` | The dark lift · Ride the lift · Ride down · Call the lift down | n/a | ok |
| interact label | `L05/Obstacle.tsx:338` | Read about Ent | n/a | ok |
| say() | `L05/Obstacle.tsx:285` | I need a way to build first. | n/a | ok |
| say() | `L05/Obstacle.tsx:291` | It sleeps until every laptop holds its share. | n/a; matches FACTS.md:97-100 "runs its share" | ok |
| say() | `L05/Obstacle.tsx:306` | Step aboard the lift first. | n/a | ok |
| say() | `L05/Obstacle.tsx:408` | The laptops hum — the lift wakes. | n/a | ok |
| say() | `L05/Obstacle.tsx:418` | That share belongs to a different laptop. | n/a | ok |
| pill | `L05/Obstacle.tsx:557` | Step aboard the lift, or registry hint "Drag each block onto a laptop" (`registry.ts:61`) | n/a instruction | ok |
| v4 only | `L05/Game.tsx:158,159,197,201,202` | Give each laptop only the shards it can hold. · one 27B model · it answers · Drag a pin, or tap a gap. · Auto-split | FACTS.md:96 "S9 says shards" | "shards" jargon, v4 only |

### L04 ALive (project, Delhi)

| surface | file:line | string | FACTS verdict | flag |
|---|---|---|---|---|
| eyebrow | `registry.ts:71` | Delhi · Oct 2026 | FACTS.md:109 yes (S3 created 2026-10-10, pushed 2026-10-16) | ok |
| title | `registry.ts:71` | ALive | FACTS.md:110 yes (repo name; live page title says "Alive") | ok |
| caption line | `registry.ts:72` | Built for the AWS × WeMakeDevs Environmental Hacks. Live, street-level air for Delhi-NCR. | FACTS.md:111-112 yes (S4) | ok |
| caption after solve (tech) | `registry.ts:75` | The air field is rebuilt every 15 minutes from ground monitors and a model grid. Search covers over 240,000 Delhi places. | FACTS.md:115-116 yes (S4 "Rebuilt every 15 minutes"; 240,027 places) | "air field", "model grid" are jargon |
| badge | `registry.ts:79` | Clear air | n/a label | ok |
| interact label | `L04/Obstacle.tsx:112` | power the sensor / a silent sensor | n/a | ok |
| interact label | `L04/Obstacle.tsx:132` | pulse | n/a | one-word label |
| interact label | `L04/Obstacle.tsx:146` | power the tower | n/a | ok |
| AQI tags | `street.v5.tsx:315` | the word "AQI" only | FACTS has no AQI figure | ok. Invented values at `L04/Obstacle.tsx:33-35` are not drawn: do not render them |
| not on V5 route | `registry.ts:73,74` | hint "Drag the sensors onto the glowing spots", story "ALive shows the air at the exact spot you stand on…" | FACTS.md:114 yes | no V5 surface shows them |
| v4 only | `L04/Game.tsx:63,65,141,142,145-147` | Clear the air · Delhi street map · street map · every 15 min · Tap the bright spots to place sensors. · Keep going… · Air clearing street by street. | "every 15 min" sourced (FACTS.md:115) | v4 only |

### I02 On the road (interlude)

| surface | file:line | string | FACTS verdict | flag |
|---|---|---|---|---|
| eyebrow | `registry.ts:83` | Between stops | n/a | ok |
| caption line | `registry.ts:84` | Off the keyboard, I like to travel and show people around. | FACTS.md:126 yes (S1 "Off the keyboard: traveller, happy showing people around") | ok |
| badge after solve | `registry.ts:88` | Between stops · Traveller | FACTS.md:130 yes (S1) | ok |
| in-world text | `station.v5.tsx:48` | none: the nameboard is blank by design | n/a | ok |
| v4 only | `I02/Game.tsx:193,215,216,287,392,420,430` | Four stamps. The line goes on. · Not at a platform. Hold to roll on. · Already stamped. Hold for the next stop. · A small rail line running past four towns · Hold the lever to move the train, let go to stop · Stamps · Hold the lever to ride, let go at each stop. | n/a | v4 only |

### L06 Remote (project)

| surface | file:line | string | FACTS verdict | flag |
|---|---|---|---|---|
| eyebrow | `registry.ts:92` | Oct 2026 | FACTS.md:136 yes (S3 created 2026-10-11, pushed 2026-10-15) | ok |
| caption line | `registry.ts:93` | Coding agents run on my laptop, and I steer them from my phone. | FACTS.md:138 yes (S2, S5) | ok |
| caption after solve (tech) | `registry.ts:96` | A zero-dependency C++20 daemon runs on the laptop and an Expo app runs on the phone. Prompts go to the agent, and text, screenshots and approvals stream back. | FACTS.md:141-142 yes (S5) | jargon: daemon, C++20, Expo |
| finale stack | `Finale.tsx:23` | C++20 · Expo | FACTS.md:141 yes | jargon |
| badge | `registry.ts:97` | Long reach | n/a label | ok |
| PILL HINT (every phase) | `L06/Obstacle.tsx:24,490` | Tap a task on the phone (registry hint, `registry.ts:94`) | FACTS.md n/a | FLAG: the V5 phone UI has no task to tap (`PhoneUI.v5.tsx` has no task list). The V4 phrase shows during the boarding phase. Owner should replace it with a V5 instruction. |
| pill (fly phase) | `L06/Obstacle.tsx:490` | Follow the warm rings — set down on the far pad | n/a | ok |
| interact label | `L06/Obstacle.tsx:183` | Board the helicopter | n/a | ok |
| phone header | `PhoneUI.v5.tsx:73` | remote | n/a | ok |
| phone close (aria) | `PhoneUI.v5.tsx:74` | Close phone | a11y | ok |
| phone status | `PhoneUI.v5.tsx:79-81` | linking to the drone… · flying — nudge the stick · switch reached · the bridge is out | n/a | ok |
| phone status | `PhoneUI.v5.tsx:84` | the little rock is connected now / the drone sees what the laptop sees | n/a | ok |
| phone buttons | `PhoneUI.v5.tsx:100` | Done / Put away | n/a | ok |
| phone hint | `PhoneUI.v5.tsx:102` | left thumb steers · it flies on its own | n/a | ok |
| v4 only | `L06/Game.tsx:8-10,38,39,42,150,268` | fix the failing test · add dark mode · write the README · Running agent... · Analyzing codebase... · Tests passing ✓ · ✓ Done · ✓ | "Tests passing" is simulated UI, not a fact about Govinda | v4 only, delete with v4 |

### L07 Wispr Wrap (project)

| surface | file:line | string | FACTS verdict | flag |
|---|---|---|---|---|
| eyebrow | `registry.ts:101` | Oct 22, 2026 | FACTS.md:151 yes (S3 created 2026-10-22) | ok |
| caption line | `registry.ts:102` | I talk into my phone and the words land on my Linux laptop. | FACTS.md:153 yes (S7 "so the phone becomes the mic") | ok |
| caption after solve (tech) | `registry.ts:105` | Finished text from the phone is sent to a small service on the laptop, which types it into whatever window has focus. | FACTS.md:156 yes (S7 daemon on :8741) | ok |
| badge | `registry.ts:106` | No keys | FACTS.md:158 n/a label; reads as a claim (no API keys?) | FLAG: unsourced-looking. Replace with a plain label or a FACTS line. |
| interact label | `L07/Obstacle.tsx:54` | Speak into the mic | n/a | ok |
| interact label | `L07/Obstacle.tsx:68` | Tap “hello” (also from, my, phone; `layout.ts:13`) | n/a | ok |
| pill | `L07/Obstacle.tsx:199` | Tap the words (registry hint, `registry.ts:103`) | n/a | ok |
| voice eyebrow | `VoiceUI.v5.tsx:94` | the studio is listening for | n/a | ok |
| voice status | `VoiceUI.v5.tsx:98` | type it and send it across · listening, say it into the mic · say it into the mic | n/a | ok |
| voice status | `VoiceUI.v5.tsx:53` | sent “…” · heard “…”. try: hello | n/a | period style |
| voice buttons | `VoiceUI.v5.tsx:112,116,119,121` | Send · say it · type it instead · not now | n/a | ok |
| screen text | `L07/Diorama.tsx:50,54,55`, `kit.v5.tsx:49` | waiting… and the words on the studio screen | n/a | ok |
| v4 only | `L07/Game.tsx:216,383,397-405` | Words that travel · Type here... · {n} words · speak · type · Hold the mic and say a line, or type it. · try: hello from the other side of the room · Type a line and tap send. · Keep going… · Words delivered | n/a | v4 only |
| story (not on V5 route) | `registry.ts:104` | Wispr Wrap: dictate on your phone with Wispr Flow, and the text types at your cursor on Linux. | FACTS.md:155 yes (S7) | ok |

### L08 Sign-Flow (project)

| surface | file:line | string | FACTS verdict | flag |
|---|---|---|---|---|
| eyebrow | `registry.ts:110` | Oct 27 – 31, 2026 | FACTS.md:164 yes (S3) | ok |
| title | `registry.ts:110` | Sign-Flow | FACTS.md:165 yes | ok |
| caption line | `registry.ts:111` | Teach the laptop your own hand signs. | FACTS.md:166 yes (S6) | ok |
| caption after solve (tech) | `registry.ts:114` | The phone reads 21 points on your hand, and the laptop matches each sign against the takes you recorded. Each sign types a phrase or runs an action. | FACTS.md:170-171 yes (S6 "Only 21 landmark points per hand go to the laptop") | ok |
| badge | `registry.ts:115` | No hands | n/a label | ok |
| links | `registry.ts:115` | Live · GitHub | FACTS.md:172-173 yes | ok |
| pill | `L08/Obstacle.tsx:188` | Tap the hand that matches (registry hint, `registry.ts:112`) | n/a | FLAG: nothing is tappable. The plaza board cards only carry links (`plaza.v5.tsx:219-226`, no click handler). The V5 flow is "speak to the guardian", "read the plaza board", "trace the sign". Replace the pill with the V5 instruction. |
| caption | `L08/Obstacle.tsx:122` | The guardian steps aside. | n/a | ok |
| caption | `L08/Obstacle.tsx:134` | Match the sign on the laptop first. | n/a | ok |
| caption | `L08/Obstacle.tsx:152` | The guardian shows you a sign. | n/a | ok |
| interact label | `L08/Obstacle.tsx:131,141` | Speak to the guardian · Read the plaza board | n/a | ok |
| sign pad title and sub | `L08/Obstacle.tsx:158` | Trace the guardian’s sign · One stroke — the shape on the tablet. | n/a | ok |
| board canvas | `plaza.v5.tsx:191,198` | Sign-Flow · the hand that matches | FACTS.md:165 | ok |
| voice title | `voiceui.v5.tsx:44` | The guardian is listening | n/a | ok |
| voice placeholder | `voiceui.v5.tsx:52` | type “hello” | n/a | ok |
| voice buttons | `voiceui.v5.tsx:56,57` | type it instead · use the microphone | n/a | ok |
| voice note | `voiceui.v5.tsx:28` | It heard something else — try again. | n/a | ok |
| sign note | `signui.v5.tsx:141` | Trace the shape in one stroke. · Not quite — follow the shape once more. | n/a | ok |
| camera note | `signui.v5.tsx:188` | Camera unavailable — draw with a finger or mouse. | n/a | ok |
| sign pad buttons | `signui.v5.tsx:240,242,244` | Clear · or sign to the camera · stop the camera | n/a | ok |
| camera privacy line | `signui.v5.tsx:246` | Move your hand slowly — nothing leaves this device. | NO FACTS LINE. No network call exists in `src/levels/L08` (grep), so the on-page camera may be local. But FACTS.md has no line for it, and S6 (FACTS.md:170) says landmark points go from the phone to the laptop. | FLAG: source it or cut |
| close (aria) | `v5kit.v5.tsx:221` | Close | a11y | ok |
| v4 only | `L08/Game.tsx:227,230,249,258,267,273` | Teach each hand a key, then sign the sentence. · Step 1 · teach · Step 2 · sign · hello · the laptop needs · Use my camera | n/a | v4 path also imports `L08/Play.tsx` (live); `Game.tsx` is v4-only |
| story (not on V5 route) | `registry.ts:113` | … Built for the #NoHandsChallenge. | FACTS.md:169 yes (S6 credits) | hashtag reads as social copy; prefer "Built for the No Hands challenge" |
| win burst (no text) | `L08/Play.tsx:260` | 24-particle burst, colour `#f2b35e`, fired on win | design rule: no confetti | FLAG: confetti-like effect on the V5 path (`L08/Obstacle.tsx:19` imports this `Play`). Confirm in the screenshot. |

### L09 The schoolhouse (finale)

| surface | file:line | string | FACTS verdict | flag |
|---|---|---|---|---|
| eyebrow | `registry.ts:119` | Now | n/a | ok |
| title | `registry.ts:119` | The schoolhouse | n/a | ok |
| caption line | `registry.ts:120` | Right now I’m building ALive and Remote. | FACTS.md:182 yes (S2) | ok |
| caption after solve (tech) | `registry.ts:123` | Each project island links to its repo or a live demo. | FACTS.md:186 yes, but the repo/demo table (FACTS.md:189-199) has no L07 or L08 rows | never shown: the finale hides the caption (`Caption.tsx:29`). FACTS gap, see section 5 |
| badge | `registry.ts:124` | Right now | n/a | never shown (hidden by the finale). After solve it would read "Now · Right now", which is redundant. |
| finale eyebrow | `Finale.tsx:32` | Now · The schoolhouse | n/a | ok |
| finale name | `Finale.tsx:33` | Govinda Chauhan | FACTS.md:34 yes (GitHub name; S1) | ok |
| finale line | `Finale.tsx:34` | = registry.ts:120 | FACTS.md:182 | ok |
| finale projects | `Finale.tsx:41-53` | project title, place, tech and links for L03, L05, L04, L06, L07, L08 | per project, see above | ok |
| finale stack | `Finale.tsx:20-24,58` | React · Vercel · Rust · C++20 · Expo | FACTS.md:84, 99, 141 yes | jargon, sourced |
| finale contact | `Finale.tsx:63` | Email · GitHub · LinkedIn | FACTS.md:33-35 yes | ok |
| finale buttons | `Finale.tsx:66,68` | Résumé · Keep walking | FACTS.md:32 yes (link) | ok |
| interact label | `L09/Obstacle.tsx:282,300,314,327,345` | Climb the wall · Pick up the plank · Lay the plank · Wind the crank · Trace the sign on the stone | n/a | ok |
| caption | `L09/Obstacle.tsx:285` | The wall is just a little too tall. | n/a | ok |
| caption | `L09/Obstacle.tsx:303` | The plank is heavier than it looks — a builder would know. | n/a | wink, mild |
| caption | `L09/Obstacle.tsx:306` | Carry it to the gap in the porch. | n/a | ok |
| caption | `L09/Obstacle.tsx:330` | The crank barely turns — it needs a practised hand. | n/a | "practised" (British) vs "practiced" elsewhere is fine but mixed (see traveller) |
| caption | `L09/Obstacle.tsx:336` | The bell rings out over the rooftops. | n/a | ok |
| caption | `L09/Obstacle.tsx:348` | The stone waits for a sign you haven’t learned. | n/a | ok |
| caption | `L09/Obstacle.tsx:357,399` | The last light comes on. · It fits. | n/a | ok |
| sign pad | `L09/Obstacle.tsx:355` | Trace the sign on the stone · One slow stroke, like chalk on slate. | n/a | ok |
| v4 only | `registry.ts:121-122`, `L09/Game.tsx:14-16,71,123,125,134,137` | Open the school gate. · Tap the right answer · quiz (plants) · Three quick questions about plants. · Tap send to start the quiz. · Answer each question. · School blackboard · Send message | task and hint: n/a | v4 only |

### Interludes and finale notes

* The V5 Ribbon has no visible text (years removed, `Ribbon.tsx:21`), so the FACTS-unverified years never show.
* `WHEN` labels (`src/v5/core.ts:21-24`: 2023, 2024) are not rendered anywhere (grep: no use). Code only.
* `Heli` default prompt "climb in" (`src/v5/player/Heli.tsx:60`) appears only on `?sandbox` (`Sandbox.tsx:95`). L06 overrides it with "Board the helicopter" (`L06/Obstacle.tsx:183`).

## 3. Proposed one-line taglines (one per project)

Each line is plain and sourced. Specifics (27B, 21 points, 15 minutes, C++20) make them technical without hype. Owners may choose.

| project | tagline | FACTS source |
|---|---|---|
| L03 Small websites | Four weekend web products, built with React and shipped on Vercel. | FACTS.md:83 (four named weekend builds, all 200); FACTS.md:84 (react-dom, Vercel) |
| L05 Ent | One 27B model, shared across four ordinary laptops over Wi-Fi. | FACTS.md:95 (S9 "Four laptops... One 27-billion-parameter model — over Wi-Fi"); FACTS.md:98 (RUN 03, Sep 16) |
| L04 ALive | Live street-level air for Delhi-NCR, rebuilt every 15 minutes. | FACTS.md:112 (S4 "Live, street-level air for Delhi-NCR"); FACTS.md:115 (S4 "Rebuilt every 15 minutes") |
| L06 Remote | Coding agents run on my laptop, and I steer them from my phone over Wi-Fi or Tailscale. | FACTS.md:138 (S2, S5); FACTS.md:140 (S5 "Wi-Fi or Tailscale") |
| L07 Wispr Wrap | Dictate on the phone, and the words type at the cursor on my Linux laptop. | FACTS.md:153 (S7 "so the phone becomes the mic"); FACTS.md:155 (S7 "the text types itself at your laptop cursor") |
| L08 Sign-Flow | Record your own hand signs on a phone camera, then type or control the laptop with them. | FACTS.md:166 (S6 "Teach your phone camera a few hand signs of your own"); FACTS.md:168 (S6 three takes; Text and Control modes) |

Finale line, not a project: "Right now I’m building ALive and Remote." (FACTS.md:182, S2).

## 4. Broken-looking UI states (390 and 1440)

Status: no PNG captured yet. The shared Chrome lock (`/tmp/gj-chrome.lock`) stayed held by other sessions for 30+ minutes per attempt (section 6). The list below is a static prediction from `src/v5/ui/v5.css` and the components. Each item must be confirmed or struck from the PNGs under `proofs/v7/copyqa/` before the final push.

| # | viewport | surface | predicted problem | source |
|---|---|---|---|---|
| 1 | 390 | finale card (`?qa&fresh&finale&lite`) | Likely taller than the viewport. The card is `max-height: 86vh; overflow-y: auto`, so "Keep walking" and "Résumé" may sit below the fold. Six project blocks, five of them with two-sentence tech lines (all but L07), drive the height. | `v5.css:69,82`; `Finale.tsx:36-68` |
| 2 | 390 | island caption (all islands) | `.v5-cap` is `width: min(520px, 84vw)` with `box-sizing: content-box` and 44px side padding, so the box is about 415px on a 390px screen. Text wraps inside, but the paper halo runs past both edges. | `v5.css:34-37` |
| 3 | 390 | L06 caption, lifted to top 110px | Sits right under the ribbon ticks (about 86px). Watch for crowding with the ribbon and the L06 scrim. | `v5.css:133` |
| 4 | 1440 | finale card | `max-width: 700px` with a two-up project grid. L03 and L05 tech lines may still push the card into its own scroll. | `v5.css:99-102` |
| 5 | 390 | pill hints and touch controls | The bottom pill (`PillHint`) may collide with the use and jump buttons or the stick. | `Controls.tsx:41,146-170` |
| 6 | both | L08 win | The win burst (`L08/Play.tsx:260`) is confetti-like, which the design rules forbid. | `L08/Play.tsx:260` |
| 7 | both | L08 pill | "Tap the hand that matches" names an action that does not exist on V5. | `L08/Obstacle.tsx:188` |

Not yet covered by any capture: L01, L02, I01, I02, L04, L07, L08 (arrival at both sizes), the Ent card (L05, needs a click), the L06 phone UI (needs a click), and the sign pad (L08 and L09). Those need an interaction script and are queued after the first screenshot run.

## 5. Owner flags (not edited, src/levels is owned by the story sessions)

1. storyA, `registry.ts:49` and `:54`: "Doorway, a desktop app" is the desktop repo; the "Doorway IDE" link is the web demo. FACTS.md:196 says separate. Split the sentence or rename the link.
2. storyC, `registry.ts:94`, rendered at `L06/Obstacle.tsx:490`: the pill "Tap a task on the phone" describes a V4 mechanic. The V5 phone has no task list. Replace with a V5 instruction.
3. storyD, `registry.ts:106`: badge "No keys" has no FACTS line and reads as a claim. Use a plain label.
4. storyD, `src/levels/L08/signui.v5.tsx:246`: "nothing leaves this device" has no FACTS line. The page makes no network call, so it may be true for the on-page camera, but S6 says landmarks go from the phone to the laptop. Source it or delete it.
5. storyD, `L08/Obstacle.tsx:188`: the pill "Tap the hand that matches" points at nothing tappable on V5. Replace it with the V5 instruction.
6. storyD, `registry.ts:113`: "#NoHandsChallenge" is a hashtag. Use the challenge name in words (FACTS.md:169 credits "No Hands" challenge).
7. storyA, `L03/Obstacle.tsx:150,180`: captions in lowercase; the rest of the game is sentence case. Pick one.
8. storyA, `src/levels/L02/Game.tsx:16`: v4-only letters that say "No" and "Not this time". This reintroduces the rejection story FACTS.md:57-58 removed. Delete with the v4 path.
9. storyD, `L09/Obstacle.tsx:303`: "a builder would know" is a wink. Optional.
10. L04 owner: keep the invented AQI values (`L04/Obstacle.tsx:33-35`) out of the render. They are not in FACTS.
11. FACTS.md gap: the repo and demo table (`FACTS.md:189-199`) has no L07 or L08 rows, but the finale says "Each project island links to its repo or a live demo" (`registry.ts:123`). Add L07 and L08 rows.
12. FACTS.md gap: HowTo copy (`src/v5/ui/HowTo.tsx:48-49`) and the in-world captions are not quoted in FACTS.md, though its header says they are. Add rows.
13. Legacy path: `?v4` still renders the old overlay and every `Game.tsx` and `Play.tsx`. Recommend deleting it before launch. Until then it carries the unsourced items above.
14. Hygiene (not visible): `PromptHUD` names in `L06/dev.v5.tsx`, `L07/dev.v5.tsx`; `.hud` classes in the preview files; the `src/ui/styles.css:188` comment; `L05/Obstacle.tsx:1` comment "home Wi-Fi"; `L01/Obstacle.tsx:2` comment "2023". Rename or delete.

## 6. Verification

* Visible-copy scans: exclamation, emoji, "level complete", cringe, misspelling list, HUD / vendor / Mergetober / fellowship names (grep over `src`). Results in section 1.
* Typecheck: `nice ./node_modules/.bin/tsc --noEmit -p .` passes (exit 0) with the two section 0 edits.
* Screenshots: queued behind another session's Chrome lock (`/tmp/gj-chrome.lock`). The first batch hit the 30-minute lock wait and exited without output. Re-queued as a smaller batch (intro, finale, L03, L05 at 1440 and 390), then L01, L02, L04, L06 to L09, I01, I02. Section 4 is filled from `proofs/v7/copyqa/` once captured (gitignored).
* Dev server on 127.0.0.1:5215 (`--strictPort`, shell `1517de`), stopped by PID when done.
