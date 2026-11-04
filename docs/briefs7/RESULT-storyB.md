# RESULT storyB: story + tagline for I01, L05 (Ent), L04 (ALive)

Branch `devin/storyB`, worktree `/workspace/gj7/storyB`, port 5212.

## What changed

Copy lives in `src/levels/registry.ts` (only the L05, L04 entries; I01 copy unchanged).

| Level | Field | Before | After |
|---|---|---|---|
| L05 Ent | `line` (tagline, arrival caption) | Four ordinary laptops, one 27B model, over Wi-Fi. | Four laptops, three operating systems, one 27B model, over Wi-Fi. |
| L05 Ent | `story` (spoken on the lectern, 2 lines) | Ent splits one large model across ordinary laptops. In the third run, ... | I built Ent to pool ordinary laptops into one machine, so one large model can run across them. In the third run, four laptops on Linux, Windows and Mac served a 27B model together over Wi-Fi. |
| L05 Ent | `tech` (after win) | unchanged | unchanged |
| L04 ALive | `line` (tagline, arrival caption) | Built for the AWS × WeMakeDevs Environmental Hacks. Live, street-level air for Delhi-NCR. | Street-level air for Delhi-NCR, rebuilt every 15 minutes. |
| L04 ALive | `story` (spoken at the reader, 2 lines) | ALive shows the air ... It runs on AWS. | I built ALive for the AWS × WeMakeDevs Environmental Hacks 2026, and it runs on AWS. It shows the air at the exact spot you stand on in Delhi-NCR, and routes where you breathe less smoke. |
| L04 ALive | `tech` (after win) | unchanged | unchanged |
| I01 Stillness | `line`, `story`, `tech` | unchanged (game copy, FACTS n/a) | unchanged; `story` is now spoken when the traveller sits on the bench |

Code:
- `src/levels/L05/Obstacle.tsx`: the paper card (`EntCard`, a boxy text panel) is gone. "Read about Ent" at the lectern speaks `story` one sentence per caption line (caption under the ribbon, 3.2 s + 40 ms per character). After both lines, two link pills appear while the traveller is within 3.4 units of the lectern. The reading is cancelled when the traveller leaves the island. The caption returns to the tagline after gameplay asides (`say()` used to clear it to null).
- `src/levels/L05/card.v5.tsx`: same file name kept (no deletion). It now exports `EntLinks`, the two pills (`ent-link-ent`, `ent-link-paper`), labels and URLs from registry.
- `src/levels/L04/Obstacle.tsx`: new kerbside reader (`object3D` at the AQI reader position) with interactable "Read about ALive" (radius 1.1). It speaks `story` the same way. After reading, pills `Live` and `GitHub` (`alive-link-live`, `alive-link-github`) appear within 3 units of the reader.
- `src/levels/I01/Obstacle.tsx`: sitting at the bench speaks `story` for 4.6 s, then restores the arrival line (or clears when the island is done).

"In-world" here means the object (lectern, kerbside reader, bench) triggers Govinda's spoken line in the caption under the ribbon. There are no 3D speech bubbles and no panels.

## Copy sources (docs/FACTS.md)

Every claim in the new copy, with the FACTS line quoted:

- L05 tagline "Four laptops, three operating systems, one 27B model, over Wi-Fi."
  - FACTS line 95: "Four ordinary laptops, one 27B model, over Wi-Fi." | S9: "Four laptops. Three operating systems. One 27-billion-parameter model — over Wi-Fi, on camera." | yes
- L05 story 1 "I built Ent to pool ordinary laptops into one machine, so one large model can run across them."
  - FACTS line 95: S9 "Ordinary laptops pooled into one machine" | yes
  - FACTS line 97: "Ent splits one large model across ordinary laptops." (S9 "runs it as if it were one machine") | yes
  - "I built": FACTS line 210: Ent (name), résumé "Project ENT" | yes
- L05 story 2 "In the third run, four laptops on Linux, Windows and Mac served a 27B model together over Wi-Fi."
  - FACTS line 98: "In the third run, four laptops on Linux, Windows and Mac served a 27B model together over Wi-Fi." | yes
- L05 tech (unchanged, after win): "Written in Rust." FACTS line 99 | yes; "Each laptop runs its share in a sandbox and never gives up more than 60% of its memory." FACTS line 100 | yes
- L04 tagline "Street-level air for Delhi-NCR, rebuilt every 15 minutes."
  - FACTS line 112: "Live, street-level air for Delhi-NCR." (S4) | yes
  - FACTS line 115: "The air field is rebuilt every 15 minutes from ground monitors and a model grid." (S4 air-field diagram) | yes
- L04 story 1 "I built ALive for the AWS × WeMakeDevs Environmental Hacks 2026, and it runs on AWS."
  - FACTS line 111: "Built for the AWS × WeMakeDevs Environmental Hacks." (S4: "... Hacks 2026") | yes
  - FACTS line 114: "... It runs on AWS." (S4 README and repo description) | yes
  - "I built" / ownership: FACTS line 110: ALive (title), repo GC-WORK11/ALive | yes; FACTS line 34: GitHub GC-WORK11, name Govinda Chauhan | yes
- L04 story 2 "It shows the air at the exact spot you stand on in Delhi-NCR, and routes where you breathe less smoke."
  - FACTS line 114: "ALive shows the air at the exact spot you stand on in Delhi-NCR, and routes where you breathe less smoke. It runs on AWS." | yes
- L04 tech (unchanged, after win): FACTS line 115 (above) and line 116: "Search covers over 240,000 Delhi places." | yes
- I01 (no project; FACTS n/a, game copy): FACTS line 69: "A quiet bench by the water. Sit for a while." (n/a, game scene); FACTS line 71: "A few slow breaths, then on to the next island." (n/a, game copy)

Not used, on purpose:
- "ALive ... 53.7%" / "cut GPU memory by 53.7%": FACTS open item 4 says the number is not on screen and is not verified (the paper shows a static run, with 80.65% of an exploratory quality score kept). The storyC brief lists 53.7% as a verified example, but FACTS does not mark it verified. Flagging for the FACTS owner.
- "No GPU cluster", "GPU", "home Wi-Fi", "layers placed by memory": removed earlier as unsourced (FACTS removed list).
- Any sentence that says a 27B model does not fit on one laptop: no FACTS line says it. The Ent "why" is therefore the sourced purpose ("pool ordinary laptops into one machine", FACTS line 95), not a memory-limit motive.
- Hackathon "four days", "demoed at DTU": not in FACTS as ALive facts (FACTS line 111, removed list).

## Verification

- `nice ./node_modules/.bin/tsc --noEmit -p .`: pass (exit 0).
- Vite dev server on 5212 (`--strictPort`): the 5 edited modules return HTTP 200.
- Browser runs share one Chrome lock across ~13 sessions on a box at load 160 to 230 with about 150 MB free RAM. My screenshot and playthrough runs queued behind other sessions for more than 40 minutes. Status is in the section below.

### Browser results

Pending at the time of this commit. Updated below when the runs finish.
