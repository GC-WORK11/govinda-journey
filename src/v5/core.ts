/**
 * V5 shared contract. Owned by the integrator. Agents may ADD to this file only with a
 * clearly marked section and must never change existing signatures.
 * Read docs/V5.md first.
 */
import * as THREE from 'three'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect } from 'react'

export type Ability = 'climb' | 'build' | 'power' | 'sense' | 'remote' | 'voice' | 'sign'

/** V5 island order (Ent before Alive). Ids match src/levels/registry.ts. */
export const V5_ORDER = ['L01', 'L02', 'L03', 'I01', 'L05', 'L04', 'I02', 'L06', 'L07', 'L08', 'L09'] as const
export type IslandId = (typeof V5_ORDER)[number]
/** Ability granted when that island's obstacle is completed. */
export const GRANTS: Partial<Record<IslandId, Ability>> = {
  L02: 'climb', L03: 'build', L05: 'power', L04: 'sense', L06: 'remote', L07: 'voice', L08: 'sign',
}
/** Timeline label per island, shown on the ribbon (2023 → Nov 2026). */
export const WHEN: Record<IslandId, string> = {
  L01: '2023', L02: '2023', L03: '2024', I01: '2024', L05: 'Aug 2026', L04: 'Oct 2026',
  I02: '2026', L06: '2026', L07: '2026', L08: '2026', L09: 'Nov 2026',
}

/** Mutable per-frame player state. Written ONLY by the player controller; everyone else reads. */
export const player = {
  pos: new THREE.Vector3(),
  vel: new THREE.Vector3(),
  facing: 0,               // yaw radians
  grounded: true,
  frozen: false,           // true while a modal interaction (phone UI, voice, sign) is open
  carrying: null as string | null, // id of the carried item, see useCarryable
  island: 'L01' as IslandId, // nearest island, updated by the controller
}

/** Physics registries (plain Sets so no React re-render). World-space meshes. */
export const walkables = new Set<THREE.Object3D>() // player stands on these (raycast down)
export const blockers = new Set<THREE.Object3D>()  // player cannot pass these (horizontal rays / boxes)

export function useWalkable(ref: React.RefObject<THREE.Object3D | null>, on = true) {
  useEffect(() => { const o = ref.current; if (!o || !on) return; walkables.add(o); return () => { walkables.delete(o) } }, [ref, on])
}
export function useBlocker(ref: React.RefObject<THREE.Object3D | null>, on = true) {
  useEffect(() => { const o = ref.current; if (!o || !on) return; blockers.add(o); return () => { blockers.delete(o) } }, [ref, on])
}

/** Interactables: the controller shows ONE quiet prompt for the nearest in range; E / Enter / the
 *  on-screen action button calls use(). `at` returns the world position (read every frame). */
export type Interactable = { id: string; at: () => THREE.Vector3; radius: number; label: string; use: () => void; enabled?: () => boolean }
export const interactables = new Map<string, Interactable>()
export function useInteractable(i: Interactable | null) {
  useEffect(() => { if (!i) return; interactables.set(i.id, i); return () => { interactables.delete(i.id) } }, [i])
}

type V5State = {
  abilities: Ability[]
  done: IslandId[]
  /** Short, plain line under the ribbon (story or hint). null = hidden. */
  caption: string | null
  grant: (a: Ability) => void
  complete: (id: IslandId) => void
  setCaption: (c: string | null) => void
  reset: () => void
}
export const useV5 = create<V5State>()(
  persist(
    (set) => ({
      abilities: [], done: [], caption: null,
      grant: (a) => set((s) => (s.abilities.includes(a) ? {} : { abilities: [...s.abilities, a] })),
      complete: (id) => set((s) => {
        if (s.done.includes(id)) return {}
        const g = GRANTS[id]
        return { done: [...s.done, id], abilities: g && !s.abilities.includes(g) ? [...s.abilities, g] : s.abilities }
      }),
      setCaption: (caption) => set({ caption }),
      reset: () => set({ abilities: [], done: [], caption: null }),
    }),
    { name: 'govinda-journey-v5', partialize: (s) => ({ abilities: s.abilities, done: s.done }) },
  ),
)
export const has = (a: Ability) => useV5.getState().abilities.includes(a)

/* ── WORLD add-only section ─────────────────────────────────────────────────
 * Added by WORLD. When `cinematic.on` is true, WORLD's finale camera owns the
 * frame and the player controller should stop writing the camera (keep reading
 * input so "Keep walking" can hand control back instantly).
 */
export const cinematic = { on: false }
/* ── end WORLD add-only section ─────────────────────────────────────────── */

/** Props for every island's V5 obstacle: src/levels/<ID>/Obstacle.tsx (default export).
 *  Rendered inside the island group (island-local coords, island top y=0).
 *  Call complete() once when solved. `active` = player is on/near this island. */
export type ObstacleProps = { id: IslandId; active: boolean; complete: () => void; done: boolean }

/* ------------------------- PLAYER section (add-only) ------------------------- */
/** Optional looping emote the player controller plays instead of locomotion.
 *  Islands/UI set playerEmote.name; clear back to null to resume walking. */
export const playerEmote = { name: null as null | 'cheer' | 'sit' | 'interact' | 'use' }
/* ----------------------- end PLAYER section -------------------------------- */
