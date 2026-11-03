import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Phase = 'intro' | 'walking' | 'arrived' | 'playing' | 'panel'

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
  goto: (i: number) => void
  travel: (i: number) => void
  reset: () => void
}

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
      solve: (id) => set((s) => ({ solved: s.solved.includes(id) ? s.solved : [...s.solved, id] })),
      goto: (current) => set({ current, target: current }),
      travel: (target) => set({ target, phase: 'walking' }),
      reset: () => set({ current: 0, target: 0, solved: [], phase: 'intro', started: false }),
    }),
    { name: 'govinda-journey-v1', partialize: (s) => ({ current: s.current, target: s.current, solved: s.solved, started: s.started }) },
  ),
)
