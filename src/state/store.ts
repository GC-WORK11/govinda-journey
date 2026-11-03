import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Phase = 'intro' | 'walking' | 'arrived' | 'playing' | 'won' | 'panel'

type S = {
  current: number            // index into LEVELS the traveller stands at
  target: number             // index the traveller is heading to (== current when standing)
  solved: string[]           // ids of solved levels (badges)
  phase: Phase
  started: boolean
  muted: boolean
  setPhase: (p: Phase) => void
  start: () => void
  solve: (id: string) => void
  /** The current island's game was won: solve it, play the payoff, then settle on 'arrived'. */
  win: () => void
  goto: (i: number) => void
  travel: (i: number) => void
  reset: () => void
}

/** Filled in by the registry at startup (avoids a circular import). */
export const winCfg = { LEVELS_IDS: [] as string[], payoffMs: 2600 }

export const useJourney = create<S>()(
  persist(
    (set) => ({
      current: 0,
      target: 0,
      solved: [],
      phase: 'intro',
      started: false,
      muted: false,
      setPhase: (phase) => set({ phase }),
      start: () => set({ started: true, phase: 'arrived' }),
      win: () => set((s) => {
        if (s.phase === 'won') return {}
        const { LEVELS_IDS } = winCfg
        const id = LEVELS_IDS[s.current]
        setTimeout(() => { const st = useJourney.getState(); if (st.phase === 'won') st.setPhase('arrived') }, winCfg.payoffMs)
        return { phase: 'won', solved: s.solved.includes(id) ? s.solved : [...s.solved, id] }
      }),
      solve: (id) => set((s) => ({ solved: s.solved.includes(id) ? s.solved : [...s.solved, id] })),
      goto: (current) => set({ current, target: current }),
      travel: (target) => set({ target, phase: 'walking' }),
      reset: () => set({ current: 0, target: 0, solved: [], phase: 'intro', started: false }),
    }),
    { name: 'govinda-journey-v2', partialize: (s) => ({ current: s.current, target: s.current, solved: s.solved, started: s.started }) },
  ),
)
