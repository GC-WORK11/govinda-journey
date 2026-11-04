/**
 * I02 On the road: short spoken lines above the traveller. They play once per visit, when the
 * traveller comes near the station platform, and go quiet when they leave the island.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import * as core from '../../v5/core'

const CSS = `
.gj-i02-say{margin:0;max-width:240px;padding:9px 14px 10px;border-radius:18px;position:relative;background:color-mix(in srgb,var(--paper) 95%,transparent);color:var(--ink);font:400 15px/1.36 var(--serif);text-align:center;text-wrap:balance;box-shadow:0 8px 20px -10px rgba(60,45,30,.45);pointer-events:none;animation:gjI02Say .4s ease-out both}
.gj-i02-say:after{content:"";position:absolute;left:50%;bottom:-6px;width:12px;height:12px;margin-left:-6px;background:inherit;transform:rotate(45deg)}
@keyframes gjI02Say{from{opacity:0;transform:translateY(6px)}}
@media (prefers-reduced-motion:reduce){.gj-i02-say{animation:none}}`

/** Says `lines` one after another (3.4 s each) over the traveller's head, once per visit, the
 *  first time they are within `reach` of `near` (island-local x, z) while `on`. */
export default function Speech({ root, near, reach, lines, on }: {
  root: RefObject<THREE.Object3D | null>
  near: [number, number]
  reach: number
  lines: string[]
  on: boolean
}) {
  const g = useRef<THREE.Group>(null)
  const said = useRef(false)
  const [step, setStep] = useState(-1)
  const local = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const r = root.current
    if (!r) return
    local.copy(core.player.pos)
    r.worldToLocal(local)
    g.current?.position.set(local.x, local.y + 1.7, local.z)
    if (!said.current && on && Math.hypot(local.x - near[0], local.z - near[1]) < reach) {
      said.current = true
      setStep(0)
    }
  })

  useEffect(() => { if (!on) setStep(-1) }, [on])
  useEffect(() => {
    if (step < 0) return
    const t = window.setTimeout(() => setStep(step + 1 < lines.length ? step + 1 : -1), 3400)
    return () => window.clearTimeout(t)
  }, [step, lines.length])

  return (
    <group ref={g}>
      {step >= 0 && (
        <Html center zIndexRange={[60, 0]} style={{ pointerEvents: 'none' }}>
          <style>{CSS}</style>
          <p key={step} className="gj-i02-say" role="status">{lines[step]}</p>
        </Html>
      )}
    </group>
  )
}
