/**
 * AutoMerge — draw-call cut for static, non-interactive dressing.
 * Bakes every visible opaque mesh under it into ONE mesh per material
 * (BufferGeometryUtils.mergeGeometries) and hides the originals. The
 * originals stay in the tree, so blocker refs, raycasts (three ignores
 * `visible` when raycasting) and per-material animation (e.g. emissive
 * damping on a shared material) are unchanged. Only wrap things whose
 * meshes never move.
 *
 * V7: re-bakes when the subtree's eligible mesh count changes — GLB props
 * inside <Suspense> resolve after the first bake, and conditional dressing
 * that mounts later gets folded in too. Wrap the moving bits in <NoMerge>
 * (or keep them outside) — anything whose transform or material animates
 * still must not be merged.
 */
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const KEEP = new Set(['position', 'normal', 'color', 'uv'])

export function AutoMerge({ children }: { children: ReactNode }) {
  const root = useRef<THREE.Group>(null)
  const st = useRef({ added: [] as THREE.Mesh[], hidden: [] as THREE.Mesh[], n: -1, poll: 0 })

  /* count of meshes a bake would collect — the cheap poll that decides re-bakes */
  const count = (g: THREE.Group) => {
    let n = 0
    g.traverse((o) => { if (eligible(o as THREE.Mesh, g)) n++ })
    return n
  }

  const bake = () => {
    const g = root.current
    if (!g || new URLSearchParams(location.search).has('nomerge')) return
    const s = st.current
    // undo the previous bake before re-collecting (safe if children unmounted)
    for (const m of s.added) { g.remove(m); m.geometry.dispose() }
    for (const m of s.hidden) m.visible = true
    s.added = []; s.hidden = []

    g.updateWorldMatrix(true, true)
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert()
    const buckets = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; shadow: boolean }>()
    g.traverse((o) => {
      const m = o as THREE.Mesh
      if (!eligible(m, g)) return
      const mat = m.material as THREE.Material
      let geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
      for (const k of Object.keys(geo.attributes)) if (!KEEP.has(k)) geo.deleteAttribute(k)
      geo.morphAttributes = {}; geo.morphTargetsRelative = false
      if (!geo.attributes.normal) geo.computeVertexNormals()
      geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld))
      const b = buckets.get(mat) ?? { geos: [], shadow: false }
      b.geos.push(geo); b.shadow ||= m.castShadow; buckets.set(mat, b)
      s.hidden.push(m)
    })
    buckets.forEach(({ geos, shadow }, mat) => {
      // mergeGeometries needs one shared attribute set — fill missing uv/color
      const names = new Set<string>()
      geos.forEach((geo) => Object.keys(geo.attributes).forEach((k) => names.add(k)))
      geos.forEach((geo) => {
        for (const k of names) {
          if (geo.attributes[k]) continue
          const n = geo.attributes.position.count
          const item = k === 'color' ? 3 : 2
          const arr = new Float32Array(n * item)
          if (k === 'color') arr.fill(1)
          geo.setAttribute(k, new THREE.BufferAttribute(arr, item))
        }
      })
      const merged = geos.length > 1 ? mergeGeometries(geos, false) : geos[0]
      geos.forEach((x) => x !== merged && x.dispose())
      if (!merged) return
      const mesh = new THREE.Mesh(merged, mat)
      mesh.castShadow = shadow; mesh.receiveShadow = true
      mesh.raycast = () => {}           // collisions/occlusion keep using the hidden originals
      mesh.userData.autoMerged = true
      g.add(mesh); s.added.push(mesh)
    })
    s.hidden.forEach((m) => { m.visible = false })
    s.n = s.hidden.length
  }

  useLayoutEffect(() => {
    bake()
    const s = st.current
    return () => {
      const g = root.current
      for (const m of s.added) { g?.remove(m); m.geometry.dispose() }
      for (const m of s.hidden) m.visible = true
      s.added = []; s.hidden = []
    }
  }, [])

  /* late mounts (Suspense props, conditional dressing) re-bake once per poll */
  useFrame((_, dt) => {
    const s = st.current
    s.poll += dt
    if (s.poll < 0.4) return
    s.poll = 0
    const g = root.current
    if (!g) return
    if (count(g) !== s.n) bake()
  })

  return <group ref={root}>{children}</group>
}

/** a mesh the bake would collect (same predicate for bake + the poll count) */
function eligible(m: THREE.Mesh, g: THREE.Group) {
  if (!m.isMesh || (m as unknown as THREE.InstancedMesh).isInstancedMesh || (m as unknown as THREE.SkinnedMesh).isSkinnedMesh) return false
  if (!m.visible || m.userData.autoMerged) return false
  const mat = m.material as THREE.Material
  if (Array.isArray(mat) || mat.transparent || !mat.colorWrite || mat.visible === false) return false
  for (let p: THREE.Object3D | null = m; p && p !== g; p = p.parent) if (!p.visible || p.userData.noMerge) return false
  return true
}

/** Carve a moving/interactive subtree out of an enclosing <AutoMerge>. */
export function NoMerge({ children }: { children: ReactNode }) {
  return <group userData={{ noMerge: true }}>{children}</group>
}
