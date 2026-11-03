/**
 * Verified-copy gate for V6 (docs/FACTS.md is the source of truth; the FACTS
 * agent writes it). Until it lands, only claims that are verifiable from the
 * portfolio itself pass — names, places, links and contact routes. Descriptive
 * `tech`/`story` claims stay hidden rather than risk an unverified line.
 *
 * When FACTS lands, regenerate `VERIFIED` from it (claim -> verified).
 */
import type { IslandId } from '../core'

/** Per-level claims currently marked verified in docs/FACTS.md (stub: none yet —
 *  the audit file is still being written). */
const VERIFIED: Partial<Record<IslandId, Set<string>>> = {}

/** True while docs/FACTS.md has not landed — copy stays to names/links only. */
export const FACTS_PENDING = Object.keys(VERIFIED).length === 0

/** May the `tech` claim for `id` be shown? */
export const techVerified = (id: IslandId) => VERIFIED[id]?.has('tech') === true

/** May the `story` claim for `id` be shown? */
export const storyVerified = (id: IslandId) => VERIFIED[id]?.has('story') === true
