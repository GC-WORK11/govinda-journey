import { create } from 'zustand'
import type { Interactable } from '../core'

/**
 * Tiny UI bridge between the in-Canvas controller and the DOM overlay (Controls.tsx).
 * Written at most once per frame (and only when values change) — safe for zustand.
 */
type UI = {
  /** Nearest in-range interactable label for the prompt / use button. null = none. */
  prompt: { id: string; label: string } | null
  /** Show the touch controls (set on first touch pointer / coarse pointer). */
  touchUI: boolean
  /** Increments on each respawn → Controls plays the fade. */
  respawnKey: number
  /** True while the player is in the falling-off-the-world fade. */
  fading: boolean
  setPrompt: (p: UI['prompt']) => void
  setTouchUI: (b: boolean) => void
  setFading: (b: boolean) => void
  bumpRespawn: () => void
}

export const usePlayerUI = create<UI>()((set) => ({
  prompt: null,
  touchUI: typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches,
  respawnKey: 0,
  fading: false,
  setPrompt: (prompt) => set((s) => (s.prompt?.id === prompt?.id && s.prompt?.label === prompt?.label ? s : { prompt })),
  setTouchUI: (touchUI) => set((s) => (s.touchUI === touchUI ? s : { touchUI })),
  setFading: (fading) => set((s) => (s.fading === fading ? s : { fading })),
  bumpRespawn: () => set((s) => ({ respawnKey: s.respawnKey + 1, fading: false })),
}))

/** Mutable slot the controller fills each frame; Controls' use button fires it. */
export const currentUse: { it: Interactable | null } = { it: null }
