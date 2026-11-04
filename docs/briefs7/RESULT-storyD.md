# RESULT storyD: story and tagline for L07, L08, L09 and the finale

Branch `devin/storyD`, worktree `/workspace/gj7/storyD`, port 5214.

## What changed

Files (only these four, plus this note):

- `src/levels/registry.ts`: L07 and L08 entries only. `story`, `tech` and `badge` changed. The badges "No keys" (L07) and "No hands" (L08) read as product claims, so they are now "Dictated" and "Hand signs". The L09 entry is unchanged: its copy already matches FACTS rows 182-187.
- `src/levels/L07/Obstacle.tsx`: one caption line when the studio mic opens (the in-world "why"). Constant `WHY`; the effect that opens the sheet calls `useV5.setCaption(WHY)`.
- `src/levels/L08/plaza.v5.tsx`: the plaza board card now shows `story` between the one-line `line` and the `tech` tagline (one added element).
- `src/v5/ui/Finale.tsx`: the L01 `line` (who I am) above the L09 `line` (what I am building now); STACK gains `Linux · Wispr Flow` (L07) and `Shape match` (L08).

No new assets, meshes or draw calls. Text, one caption call, one card line.

## Copy, beat by beat

Each row: on-screen text, where it shows, and the FACTS.md line it rests on (quoted from `docs/FACTS.md`, with its row number).

### L07 Wispr Wrap (place "Oct 22, 2026")

| Beat (where it shows) | On-screen text | FACTS.md line (quoted) |
|---|---|---|
| Arrival caption (`line`) | I talk into my phone and the words land on my Linux laptop. | row 153: "I talk into my phone and the words land on my Linux laptop." (source S7: "there is no Wispr Flow for Linux — so the phone becomes the mic") |
| Mic opens, caption (new `WHY`) | There is no Wispr Flow for Linux, so the phone becomes the mic. | row 153, source S7 (same quote) |
| Story (registry data; the V4 panel, not on the V5 screen) | There is no Wispr Flow for Linux, so the phone becomes the mic. I dictate on my phone with Wispr Flow, and the text types at my cursor on Linux. | row 155: "Wispr Wrap: dictate on your phone with Wispr Flow, and the text types at your cursor on Linux." (source S7: "dictate with Wispr Flow on the phone, and the text types itself at your laptop cursor") |
| Win caption and finale tagline (`tech`) | A small laptop service types the phone’s finished text into whatever window has focus. | row 156: "Finished text from the phone is sent to a small service on the laptop, which types it into whatever window has focus." (source S7: daemon on :8741, types into any focused app) |
| Place | Oct 22, 2026 | row 151: "Oct 22, 2026 (place)"; row 215: "Wispr Wrap, 'Oct 22, 2026' (date)" |
| Badge (on win) | Dictated | label, FACTS "n/a" (game label) |
| Finale stack | Linux · Wispr Flow | row 155 ("...on Linux"), row 155 ("dictate on your phone with Wispr Flow") |

### L08 Sign-Flow (place "Oct 27 – 31, 2026")

| Beat (where it shows) | On-screen text | FACTS.md line (quoted) |
|---|---|---|
| Arrival caption (`line`) | Teach the laptop your own hand signs. | row 166: "Teach the laptop your own hand signs." (source S6: "Teach your phone camera a few hand signs of your own"; S13) |
| Board card, story (new line) | Sign-Flow lets me type or control my laptop without touching it. Built for the #NoHandsChallenge. | row 168: "Sign-Flow lets you record your own hand signs on a phone camera, then use them to type or control the laptop."; row 165 (title): "type and control your laptop without touching it"; row 169: "Built for the #NoHandsChallenge." |
| Board card and win caption tagline (`tech`) | The phone reads 21 points on your hand, and the laptop matches each sign against the takes you recorded. | row 170: "The phone reads 21 points on your hand, and the laptop matches each sign against the takes you recorded." (source S6: "Only 21 landmark points per hand go to the laptop"; "shape match and banded DTW") |
| Place | Oct 27 – 31, 2026 | row 164: "Oct 27 – 31, 2026 (place)"; row 217 |
| Badge (on win) | Hand signs | label, FACTS "n/a" |
| Finale stack | Shape match | row 170 source note: "shape match and banded DTW" (S6) |

The board's canvas text ("Sign-Flow", "the hand that matches") is row 257 ("Canvas text 'Sign-Flow'...") and game copy, respectively.

### L09 finale ("Now · The schoolhouse")

| Beat (where it shows) | On-screen text | FACTS.md line (quoted) |
|---|---|---|
| Eyebrow | Now · The schoolhouse | rows 219-220: "Now (L09 place; eyebrow)" and "The schoolhouse ... game label" (both n/a) |
| Name | Govinda Chauhan | row 222: "Govinda Chauhan (name)" (verified) |
| Who I am (new line, `LEVEL_BY_ID.L01.line`) | I study Computer Science and Data Analytics at IIT Patna, and I build software and ML systems. | row 45: "I study Computer Science and Data Analytics at IIT Patna, and I build software and ML systems." (source S1) |
| What I am building now (`line`) | Right now I’m building ALive and Remote. | row 221: "Right now I’m building ALive and Remote." (source: govinda-01.vercel.app) |
| Arrival caption on L09 | the same `line` | row 221 |
| Finale completion caption (`tech`, hidden under the card) | Each project island links to its repo or a live demo. | row 186: "Each project island links to its repo or a live demo." |
| Project list | taglines and links from each project's registry entry (L03, L05, L04, L06, L07, L08) | rows 151-170 for L07 and L08; L03/L04/L05/L06 are their owners' rows |
| School captions (wall, plank, bell, stone) | game copy, no claim | row 260: "game copy with no factual claim" (n/a) |

## How verified

- `tsc --noEmit -p .`: clean (no output, 28 s).
- Production build `vite build` to `/tmp/gj7-storyD-dist`: passes (5 min 54 s). Directory deleted afterwards.
- Dev server on :5214 (`--strictPort`), stopped by PID when done.
- Screenshots (JPEG, gitignored): `proofs/v7/storyD/` (see the list below). Each level at 390 (`&lite`) and 1440: arrival caption, mic caption (L07), board card (L08), win caption (L07, L08), finale card (L09).
- Playthrough `node scripts/v5/play.mjs --only=<ID>` at 1440 and 390 `--lite` for L07, L08, L09: results below.

### Status at push time (13:58 IST): not yet verified in a browser

- Playthrough (`scripts/v5/play.mjs --only=L07,L08,L09`, 390 with `--lite`, and 1440): NOT COMPLETED. The shared Chrome lock was held by other sessions for the whole window. Four attempts each waited 15 to 30 minutes and timed out before starting. One combined run (both sizes, with arrival, post-solve and finale shots) is queued behind the lock. If it finishes before 14:15 IST, its PASS/FAIL lines will be added here in a last push. Otherwise this row stays open.
- Screenshot read-back at 390 and 1440: NOT DONE. The screenshot driver (`/tmp/gj7-storyD-tools/shots.mjs`) hit the same lock wait and then a navigation timeout, so no image of the new copy has been looked at. This is the main open item.
- What is verified: `tsc --noEmit` (clean), production build (passes), and the copy strings against FACTS.md rows above (checked by reading the file, not by a render).

## Still wrong or open

- The L09 `story` ("ALive is an air map of Delhi, street by street. Remote runs the coding agents on my laptop from my phone.") is not drawn on the V5 screen. It is data for the V4 overlay only. I kept the copy correct rather than adding another card.
- The finale list is long on a 390 phone because the L03 and L05 taglines are long. Those rows belong to their owners (storyA, storyB, storyC).
- "Shape match" in the finale stack is the only jargon-leaning word left on screen. It is sourced (FACTS row 170, S6), but plainer wording would be better if a sourced alternative exists.
- The speech path (L07 "say it") needs microphone permission and was not exercised in headless Chrome; the typed fallback and the tap path were.
- No copy was added to the L09 chalkboard or to any world sign; the finale's words come from the card and the school captions.
