/**
 * Where the traveller is along the chain — the single read for ribbon, captions
 * and sky. A tracker inside the Canvas writes `idx` only when it changes.
 * `capEyebrow` pairs with useV5.caption (set by the progression watcher);
 * `finale` mirrors core.cinematic.on for the DOM side.
 */
import { create } from 'zustand'

type S = {
  idx: number
  capEyebrow: string | null
  finale: boolean
  setIdx: (i: number) => void
}
export const useWorldUI = create<S>()((set) => ({
  idx: 0,
  capEyebrow: null,
  finale: false,
  setIdx: (idx) => set((s) => (s.idx === idx ? s : { idx })),
}))
