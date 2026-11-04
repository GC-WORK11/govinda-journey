/**
 * AutoMerge — draw-call cut for static, non-interactive dressing.
 * After its children mount, bakes every visible opaque mesh under it into ONE
 * mesh per material (BufferGeometryUtils.mergeGeometries) and hides the
 * originals. The originals stay in the tree, so blocker refs, raycasts
 * (three ignores `visible` when raycasting) and per-material animation
 * (e.g. emissive damping on a shared material) are unchanged.
 * Only wrap things whose meshes never move.
 */
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export function AutoMerge({ children }: { children: ReactNode }) {
  const root = useRef<THREE.Group>(null)
  useLayoutEffect(() => {
    const g = root.current
    if (!g || new URLSearchParams(location.search).has('nomerge')) return
    g.updateWorldMatrix(true, true)
    const inv = new THREE.Matrix4().copy(g.matrixWorld).invert()
    const buckets = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; shadow: boolean }>()
    const hidden: THREE.Mesh[] = []
    g.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || (m as unknown as THREE.InstancedMesh).isInstancedMesh || !m.visible) return
      const mat = m.material as THREE.Material
      if (Array.isArray(mat) || mat.transparent || !mat.colorWrite || mat.visible === false) return
      for (let p = m.parent; p && p !== g; p = p.parent) if (!p.visible) return
      let geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
      for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k)
      if (!geo.attributes.normal) geo.computeVertexNormals()
      geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld))
      const b = buckets.get(mat) ?? { geos: [], shadow: false }
      b.geos.push(geo); b.shadow ||= m.castShadow; buckets.set(mat, b)
      hidden.push(m)
    })
    const added: THREE.Mesh[] = []
    buckets.forEach(({ geos, shadow }, mat) => {
      const merged = geos.length > 1 ? mergeGeometries(geos, false) : geos[0]
      geos.forEach((x) => x !== merged && x.dispose())
      if (!merged) return
      const mesh = new THREE.Mesh(merged, mat)
      mesh.castShadow = shadow; mesh.receiveShadow = true
      mesh.raycast = () => {}           // collisions/occlusion keep using the hidden originals
      mesh.userData.autoMerged = true
      g.add(mesh); added.push(mesh)
    })
    hidden.forEach((m) => { m.visible = false })
    return () => {
      added.forEach((m) => { g.remove(m); m.geometry.dispose() })
      hidden.forEach((m) => { m.visible = true })
    }
  }, [])
  return <group ref={root}>{children}</group>
}
