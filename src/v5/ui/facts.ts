/**
 * Verified-copy gate for V6 (docs/FACTS.md is the source of truth; the FACTS
 * agent writes it). Until it lands, only claims that are verifiable from the
 * portfolio itself pass — names, places, links and contact routes. Descriptive
 * `tech`/`story` claims stay hidden rather than risk an unverified line.
 *
 * When FACTS lands, regenerate `VERIFIED` from it (claim -> verified).
 */
import type { IslandId } from '../core'

/** Per-level claims marked verified=yes in docs/FACTS.md (audit of 2026-11-04).
 *  FACTS says: set tech and story to yes for L01, L03, L04, L05, L06, L07,
 *  L08, L09 — every other island's claims are game copy or empty (n/a). */
const YES = new Set(['tech', 'story'])
const VERIFIED: Partial<Record<IslandId, Set<string>>> = {
  L01: YES, L03: YES, L04: YES, L05: YES, L06: YES, L07: YES, L08: YES, L09: YES,
}

/** True while docs/FACTS.md has not landed — copy stays to names/links only. */
export const FACTS_PENDING = Object.keys(VERIFIED).length === 0

/** May the `tech` claim for `id` be shown? */
export const techVerified = (id: IslandId) => VERIFIED[id]?.has('tech') === true

/** May the `story` claim for `id` be shown? */
export const storyVerified = (id: IslandId) => VERIFIED[id]?.has('story') === true
