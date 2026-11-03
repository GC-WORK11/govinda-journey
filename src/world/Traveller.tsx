import { forwardRef, Suspense, useEffect, useMemo, useRef } from 'react'
import { RoundedBox, useAnimations, useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { clay, C, blobMat } from './kit'

/**
 * The traveller: a rigged low-poly student (KayKit Adventurers, CC0, retinted) with a clay
 * backpack on the chest bone. Faces +Z. `anim` picks the clip; changes cross-fade.
 */
export type Anim = 'idle' | 'walk' | 'cheer' | 'interact' | 'sit'
const CLIP: Record<Anim, string> = { idle: 'Idle', walk: 'Walking_A', cheer: 'Cheer', interact: 'Interact', sit: 'Sit_Floor_Idle' }
const URL = "./models/student.glb"
const HEIGHT = 0.95

function Model({ anim }: { anim: Anim }) {
  const root = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF(URL)
  const { actions } = useAnimations(animations, root)
  // Retinted atlas: warm brown skin, near-black hair, cream shirt, charcoal trousers.
  const skin = useTexture('./models/student-skin.png')
  const scale = useMemo(() => {
    scene.updateMatrixWorld(true)
    const b = new THREE.Box3().setFromObject(scene)
    const h = b.max.y - b.min.y
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true; m.receiveShadow = false; m.frustumCulled = false
        const mat = m.material as THREE.MeshStandardMaterial
        if (mat && 'roughness' in mat) {
          mat.roughness = 0.85; mat.metalness = 0
          if (mat.map && mat.map !== skin) {
            skin.flipY = mat.map.flipY; skin.colorSpace = mat.map.colorSpace
            skin.magFilter = mat.map.magFilter; skin.minFilter = mat.map.minFilter
            skin.wrapS = mat.map.wrapS; skin.wrapT = mat.map.wrapT; skin.needsUpdate = true
            mat.map = skin; mat.needsUpdate = true
          }
        }
      }
    })
    return h > 0.01 ? HEIGHT / h : 0.4
  }, [scene, skin])
  const chest = useMemo(() => scene.getObjectByName('chest') || scene.getObjectByName('spine'), [scene])
  useEffect(() => {
    const a = actions[CLIP[anim]] || actions.Idle
    if (!a) return
    a.reset().fadeIn(0.25).play()
    if (anim === 'cheer' || anim === 'interact') { a.setLoop(THREE.LoopRepeat, Infinity) }
    return () => { a.fadeOut(0.25) }
  }, [anim, actions])
  return (
    <group ref={root} scale={scale}>
      <primitive object={scene} />
      {chest && <BackpackOn bone={chest} />}
    </group>
  )
}

/** Mount the backpack as a child of the chest bone so it follows every animation. */
function BackpackOn({ bone }: { bone: THREE.Object3D }) {
  const g = useMemo(() => new THREE.Group(), [])
  useEffect(() => { bone.add(g); return () => { bone.remove(g) } }, [bone, g])
  return (
    <primitive object={g}>
      <group position={[0, 0.12, -0.3]}>
        <RoundedBox args={[0.5, 0.56, 0.26]} radius={0.12} smoothness={3} material={clay('#3f4b73')} castShadow />
        <RoundedBox args={[0.44, 0.28, 0.1]} radius={0.05} position={[0, -0.1, -0.15]} material={clay('#2f3858')} castShadow />
        <mesh position={[0, 0.36, 0]} rotation={[0, 0, Math.PI / 2]} material={clay(C.sand)} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.5, 12]} />
        </mesh>
      </group>
    </primitive>
  )
}

export const Traveller = forwardRef<THREE.Group, { anim?: Anim }>(function Traveller({ anim = 'idle' }, ref) {
  return (
    <group ref={ref}>
      <Suspense fallback={null}><Model anim={anim} /></Suspense>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={blobMat()} renderOrder={1}>
        <planeGeometry args={[0.72, 0.72]} />
      </mesh>
    </group>
  )
})

useGLTF.preload(URL)
