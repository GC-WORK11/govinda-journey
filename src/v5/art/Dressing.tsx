/**
 * Pack-backed set dressing for V5 islands.
 *
 * `PROPS` is the catalogue: prop name -> URL under public/models/packs.
 * `<Prop name="tree_pineDefaultA" .../>` lazy-loads that GLB via useGLTF and
 * re-skins it with the shared toon material (textures / vertex colours kept).
 * `<Scatter .../>` places a seeded ring of trees / rocks / grass / flowers /
 * bushes around an island rim, avoiding the path corridor (|x| < corridorX).
 */
import { Component, Suspense, useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { applyToon, type ToonOpts } from './material'
import { topY } from './IslandBase'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { scatterGeo, clayVC, paint, C } from '../../world/kit'
import { islandPos, islandIndex, ISLAND_R } from '../world/layout'
import { useWorldUI } from '../world/progress'
import { LEVELS } from '../../levels/registry'
import type { IslandId } from '../core'

const P = '/models/packs'

/** name -> url catalogue of everything kept in public/models/packs. */
export const PROPS: Record<string, string> = {
  // Kenney nature kit
  campfire_stones: `${P}/nature/campfire_stones.glb`,
  fence_corner: `${P}/nature/fence_corner.glb`,
  fence_gate: `${P}/nature/fence_gate.glb`,
  fence_planks: `${P}/nature/fence_planks.glb`,
  fence_simple: `${P}/nature/fence_simple.glb`,
  flower_purple_a: `${P}/nature/flower_purpleA.glb`,
  flower_purple_b: `${P}/nature/flower_purpleB.glb`,
  flower_red_a: `${P}/nature/flower_redA.glb`,
  flower_red_b: `${P}/nature/flower_redB.glb`,
  flower_red_c: `${P}/nature/flower_redC.glb`,
  flower_yellow_a: `${P}/nature/flower_yellowA.glb`,
  flower_yellow_b: `${P}/nature/flower_yellowB.glb`,
  grass: `${P}/nature/grass.glb`,
  grass_large: `${P}/nature/grass_large.glb`,
  grass_leafs: `${P}/nature/grass_leafs.glb`,
  hanging_moss: `${P}/nature/hanging_moss.glb`,
  lily_small: `${P}/nature/lily_small.glb`,
  log: `${P}/nature/log.glb`,
  log_stack: `${P}/nature/log_stack.glb`,
  mushroom_red_group: `${P}/nature/mushroom_redGroup.glb`,
  mushroom_tan_group: `${P}/nature/mushroom_tanGroup.glb`,
  path_stone: `${P}/nature/path_stone.glb`,
  path_stone_circle: `${P}/nature/path_stoneCircle.glb`,
  plant_bush: `${P}/nature/plant_bush.glb`,
  plant_bush_detailed: `${P}/nature/plant_bushDetailed.glb`,
  plant_bush_small: `${P}/nature/plant_bushSmall.glb`,
  plant_flat_short: `${P}/nature/plant_flatShort.glb`,
  plant_flat_tall: `${P}/nature/plant_flatTall.glb`,
  platform_stone: `${P}/nature/platform_stone.glb`,
  rock_large_b: `${P}/nature/rock_largeB.glb`,
  rock_small_a: `${P}/nature/rock_smallA.glb`,
  rock_small_c: `${P}/nature/rock_smallC.glb`,
  rock_small_e: `${P}/nature/rock_smallE.glb`,
  rock_small_flat_a: `${P}/nature/rock_smallFlatA.glb`,
  sign: `${P}/nature/sign.glb`,
  stone_small_b: `${P}/nature/stone_smallB.glb`,
  stone_small_d: `${P}/nature/stone_smallD.glb`,
  stone_small_flat_a: `${P}/nature/stone_smallFlatA.glb`,
  stump_round: `${P}/nature/stump_round.glb`,
  tent_small_open: `${P}/nature/tent_smallOpen.glb`,
  tree_default: `${P}/nature/tree_default.glb`,
  tree_detailed: `${P}/nature/tree_detailed.glb`,
  tree_fat: `${P}/nature/tree_fat.glb`,
  tree_oak: `${P}/nature/tree_oak.glb`,
  tree_pine_a: `${P}/nature/tree_pineDefaultA.glb`,
  tree_pine_b: `${P}/nature/tree_pineDefaultB.glb`,
  tree_pine_round: `${P}/nature/tree_pineRoundB.glb`,
  tree_pine_tall: `${P}/nature/tree_pineTallB.glb`,
  tree_small: `${P}/nature/tree_small.glb`,
  // Kenney train kit
  railroad_curve: `${P}/train/railroad-curve.glb`,
  railroad_straight: `${P}/train/railroad-straight.glb`,
  track: `${P}/train/track.glb`,
  track_single: `${P}/train/track-single.glb`,
  train_carriage_box: `${P}/train/train-carriage-box.glb`,
  train_carriage_coal: `${P}/train/train-carriage-coal.glb`,
  train_carriage_flatbed_wood: `${P}/train/train-carriage-flatbed-wood.glb`,
  train_carriage_wood: `${P}/train/train-carriage-wood.glb`,
  train_locomotive_a: `${P}/train/train-locomotive-a.glb`,
  train_locomotive_b: `${P}/train/train-locomotive-b.glb`,
  // Kenney furniture kit
  bench: `${P}/furniture/bench.glb`,
  bench_cushion: `${P}/furniture/benchCushion.glb`,
  bookcase_open: `${P}/furniture/bookcaseOpen.glb`,
  bookcase_open_low: `${P}/furniture/bookcaseOpenLow.glb`,
  books: `${P}/furniture/books.glb`,
  chair_desk: `${P}/furniture/chairDesk.glb`,
  chair_modern_cushion: `${P}/furniture/chairModernCushion.glb`,
  chair_rounded: `${P}/furniture/chairRounded.glb`,
  computer_keyboard: `${P}/furniture/computerKeyboard.glb`,
  computer_mouse: `${P}/furniture/computerMouse.glb`,
  computer_screen: `${P}/furniture/computerScreen.glb`,
  desk: `${P}/furniture/desk.glb`,
  doorway_open: `${P}/furniture/doorwayOpen.glb`,
  lamp_round_table: `${P}/furniture/lampRoundTable.glb`,
  lamp_square_floor: `${P}/furniture/lampSquareFloor.glb`,
  laptop: `${P}/furniture/laptop.glb`,
  plant_small: `${P}/furniture/plantSmall1.glb`,
  potted_plant: `${P}/furniture/pottedPlant.glb`,
  rug_rectangle: `${P}/furniture/rugRectangle.glb`,
  rug_round: `${P}/furniture/rugRound.glb`,
  side_table: `${P}/furniture/sideTable.glb`,
  table: `${P}/furniture/table.glb`,
  table_coffee: `${P}/furniture/tableCoffee.glb`,
  table_round: `${P}/furniture/tableRound.glb`,
  // KayKit dungeon remastered
  banner_brown: `${P}/dungeon/banner_patternA_brown.gltf.glb`,
  banner_green: `${P}/dungeon/banner_patternA_green.gltf.glb`,
  banner_shield_red: `${P}/dungeon/banner_shield_red.gltf.glb`,
  barrel_large: `${P}/dungeon/barrel_large.gltf.glb`,
  barrel_stack: `${P}/dungeon/barrel_small_stack.gltf.glb`,
  box_large: `${P}/dungeon/box_large.gltf.glb`,
  box_stacked: `${P}/dungeon/box_stacked.gltf.glb`,
  candle_lit: `${P}/dungeon/candle_lit.gltf.glb`,
  candle_triple: `${P}/dungeon/candle_triple.gltf.glb`,
  dungeon_chair: `${P}/dungeon/chair.gltf.glb`,
  chest: `${P}/dungeon/chest.glb`,
  chest_gold: `${P}/dungeon/chest_gold.glb`,
  coin_stack: `${P}/dungeon/coin_stack_small.gltf.glb`,
  column: `${P}/dungeon/column.gltf.glb`,
  keg: `${P}/dungeon/keg.gltf.glb`,
  key: `${P}/dungeon/key.gltf.glb`,
  pillar: `${P}/dungeon/pillar.gltf.glb`,
  rubble_half: `${P}/dungeon/rubble_half.gltf.glb`,
  rubble_large: `${P}/dungeon/rubble_large.gltf.glb`,
  shelf_large: `${P}/dungeon/shelf_large.gltf.glb`,
  stairs_wood: `${P}/dungeon/stairs_wood.gltf.glb`,
  stool: `${P}/dungeon/stool.gltf.glb`,
  sword_shield: `${P}/dungeon/sword_shield.gltf.glb`,
  table_long: `${P}/dungeon/table_long.gltf.glb`,
  table_medium: `${P}/dungeon/table_medium_tablecloth.gltf.glb`,
  torch_lit: `${P}/dungeon/torch_lit.gltf.glb`,
  torch_mounted: `${P}/dungeon/torch_mounted.gltf.glb`,
  trunk_large: `${P}/dungeon/trunk_large_B.gltf.glb`,
  trunk_medium: `${P}/dungeon/trunk_medium_B.gltf.glb`,
  wall: `${P}/dungeon/wall.gltf.glb`,
  wall_arched: `${P}/dungeon/wall_arched.gltf.glb`,
  wall_arched_window: `${P}/dungeon/wall_archedwindow_open.gltf.glb`,
  wall_doorway: `${P}/dungeon/wall_doorway.glb`,
  wall_gated: `${P}/dungeon/wall_gated.gltf.glb`,
  wall_scaffold: `${P}/dungeon/wall_scaffold.gltf.glb`,
  // KayKit city builder bits (gltf + bin + shared texture)
  building_a: `${P}/city/building_A_withoutBase.gltf`,
  building_b: `${P}/city/building_B_withoutBase.gltf`,
  building_c: `${P}/city/building_C_withoutBase.gltf`,
  building_f: `${P}/city/building_F_withoutBase.gltf`,
  building_g: `${P}/city/building_G_withoutBase.gltf`,
  city_bench: `${P}/city/bench.gltf`,
  city_bush: `${P}/city/bush.gltf`,
  streetlight: `${P}/city/streetlight.gltf`,
  water_tower: `${P}/city/watertower.gltf`,
  box_a: `${P}/city/box_A.gltf`,
  // KayKit furniture bits (gltf + bin + shared texture)
  armchair: `${P}/home/armchair_pillows.gltf`,
  book_set: `${P}/home/book_set.gltf`,
  chair_stool_wood: `${P}/home/chair_stool_wood.gltf`,
  couch: `${P}/home/couch_pillows.gltf`,
  lamp_standing: `${P}/home/lamp_standing.gltf`,
  rug_oval: `${P}/home/rug_oval_A.gltf`,
  shelf_decorated: `${P}/home/shelf_B_large_decorated.gltf`,
  table_medium_long: `${P}/home/table_medium_long.gltf`,
  // Quaternius ultimate stylized nature
  pine_1: `${P}/quaternius/pine_1.glb`,
  pine_2: `${P}/quaternius/pine_2.glb`,
  pine_3: `${P}/quaternius/pine_3.glb`,
  pine_4: `${P}/quaternius/pine_4.glb`,
  quat_plant: `${P}/quaternius/plant_1.glb`,
  quat_plant_2: `${P}/quaternius/plant_2.glb`,
  quat_plant_big: `${P}/quaternius/plant_big_1.glb`,
  quat_plant_big_2: `${P}/quaternius/plant_big_2.glb`,
  quat_rock: `${P}/quaternius/rock_medium_1.glb`,
  quat_rock_2: `${P}/quaternius/rock_medium_2.glb`,
  quat_rock_3: `${P}/quaternius/rock_medium_3.glb`,
  rock_path_round: `${P}/quaternius/rock_path_round_a.glb`,
  rock_path_round_2: `${P}/quaternius/rock_path_round_b.glb`,
  rock_path_wide: `${P}/quaternius/rock_path_wide.glb`,
  twisted_tree_1: `${P}/quaternius/twisted_tree_1.glb`,
  twisted_tree_2: `${P}/quaternius/twisted_tree_2.glb`,
  twisted_tree_3: `${P}/quaternius/twisted_tree_3.glb`,
  twisted_tree_4: `${P}/quaternius/twisted_tree_4.glb`,
  twisted_tree_5: `${P}/quaternius/twisted_tree_5.glb`,
  // V6 — Kenney City Kit Commercial (L06 modern city; colormap.png sidecar)
  city_building_a: `${P}/citykit/building-a.glb`,
  city_building_b: `${P}/citykit/building-b.glb`,
  city_building_c: `${P}/citykit/building-c.glb`,
  city_building_d: `${P}/citykit/building-d.glb`,
  city_building_e: `${P}/citykit/building-e.glb`,
  city_skyscraper_a: `${P}/citykit/building-skyscraper-a.glb`,
  city_skyscraper_b: `${P}/citykit/building-skyscraper-b.glb`,
  city_skyscraper_c: `${P}/citykit/building-skyscraper-c.glb`,
  city_skyscraper_d: `${P}/citykit/building-skyscraper-d.glb`,
  city_skyscraper_e: `${P}/citykit/building-skyscraper-e.glb`,
  city_low_a: `${P}/citykit/low-detail-building-a.glb`,
  city_low_b: `${P}/citykit/low-detail-building-b.glb`,
  city_low_c: `${P}/citykit/low-detail-building-c.glb`,
  city_low_d: `${P}/citykit/low-detail-building-d.glb`,
  city_low_e: `${P}/citykit/low-detail-building-e.glb`,
  city_low_f: `${P}/citykit/low-detail-building-f.glb`,
  city_low_g: `${P}/citykit/low-detail-building-g.glb`,
  city_low_h: `${P}/citykit/low-detail-building-h.glb`,
  city_awning: `${P}/citykit/detail-awning.glb`,
  city_awning_wide: `${P}/citykit/detail-awning-wide.glb`,
  city_parasol: `${P}/citykit/detail-parasol-a.glb`,
  helicopter: `${P}/citykit/helicopter.glb`,
}

/** Prop sets used by <Scatter kinds>. V4's look is round trees, small flowers
 * and pebbles — spiky agave shapes and cold-coloured hero props stay in PROPS
 * for islands that want them, but out of the default sets. */
export const SCATTER_SETS: Record<string, string[]> = {
  tree: ['tree_oak', 'tree_default', 'tree_fat', 'tree_detailed', 'tree_pine_round', 'tree_small'],
  rock: ['rock_small_a', 'rock_small_c', 'rock_small_e', 'rock_small_flat_a', 'stone_small_b', 'stone_small_d', 'rock_large_b'],
  tuft: ['grass', 'grass_large', 'grass_leafs'],
  flower: ['flower_red_a', 'flower_red_b', 'flower_red_c', 'flower_yellow_a', 'flower_yellow_b', 'flower_purple_a', 'flower_purple_b'],
  bush: ['plant_bush', 'plant_bush_detailed', 'plant_bush_small'],
  mushroom: ['mushroom_red_group', 'mushroom_tan_group'],
  stump: ['stump_round', 'log', 'log_stack'],
}

type Vec3 = [number, number, number]

/** Dark props get a colour lift so their foliage reads in V4's soft greens. */
const PROP_LIFT: Record<string, number> = {
  pine_1: 1.3, pine_2: 1.3, pine_3: 1.35, pine_4: 1.35,
  quat_plant: 1.2, quat_plant_2: 1.2, quat_plant_big: 1.2, quat_plant_big_2: 1.2,
  quat_rock: 1.15, quat_rock_2: 1.15, quat_rock_3: 1.15,
  rock_path_round: 1.15, rock_path_round_2: 1.15, rock_path_wide: 1.15,
  twisted_tree_1: 1.15, twisted_tree_2: 1.15, twisted_tree_3: 1.15,
  twisted_tree_4: 1.15, twisted_tree_5: 1.15,
  tree_pine_a: 1.1, tree_pine_b: 1.1, tree_pine_tall: 1.1,
  plant_bush: 1.12, plant_bush_detailed: 1.12, plant_bush_small: 1.12,
  plant_flat_short: 1.15, plant_flat_tall: 1.15, hanging_moss: 1.15,
}

/** Natural footprint of each GLB, measured once per URL (shared across clones). */
const sizeCache = new Map<string, { minY: number; h: number } | null>()
function naturalSize(url: string, scene: THREE.Object3D) {
  let s = sizeCache.get(url)
  if (s === undefined) {
    const b = new THREE.Box3().setFromObject(scene)
    s = b.isEmpty() ? null : { minY: b.min.y, h: b.max.y - b.min.y }
    sizeCache.set(url, s)
  }
  return s
}

/** One broken GLB must never take down the island — props fail silently. */
class PropGuard extends Component<{ children: React.ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() { return { err: true } }
  componentDidCatch(e: unknown) { console.warn('[v5] prop failed:', e) }
  render() { return this.state.err ? null : this.props.children }
}

function PropInner({
  name,
  position,
  rotation,
  scale,
  fit,
  toonOpts,
}: {
  name: keyof typeof PROPS | string
  position?: Vec3
  rotation?: Vec3
  scale?: number | Vec3
  /** normalize the prop so its natural height ≈ `fit` metres, feet on y = 0 */
  fit?: number
  toonOpts?: ToonOpts
}) {
  const url = PROPS[name as string]
  const { scene } = useGLTF(url)
  const obj = useMemo(() => {
    const c = scene.clone(true)
    const lift = PROP_LIFT[name as string]
    applyToon(c, lift ? { ...toonOpts, lift: lift * (toonOpts?.lift ?? 1) } : toonOpts)
    const nat = naturalSize(url, scene)
    if (!nat) return c
    // outer group takes the caller's transform; inner carries fit-normalization
    const outer = new THREE.Group()
    const g = new THREE.Group()
    g.add(c)
    outer.add(g)
    c.position.y -= nat.minY
    if (fit && nat.h > 1e-4) g.scale.setScalar(fit / nat.h)
    return outer
  }, [url, scene, toonOpts, fit])
  return <primitive object={obj} position={position} rotation={rotation} scale={scale} />
}

/** Lazy-loading pack prop. Unknown names render nothing (log to console once). */
export function Prop(props: Parameters<typeof PropInner>[0]) {
  if (!PROPS[props.name as string]) {
    console.warn(`Prop: unknown name "${props.name}"`)
    return null
  }
  return (
    <Suspense fallback={null}>
      <PropGuard><PropInner {...props} /></PropGuard>
    </Suspense>
  )
}

/** Natural-height range [min,max] each kind is normalized to (metres). */
const KIND_FIT: Record<string, [number, number]> = {
  tree: [1.8, 2.9],
  rock: [0.35, 0.75],
  tuft: [0.28, 0.45],
  flower: [0.25, 0.38],
  bush: [0.5, 0.9],
  mushroom: [0.28, 0.4],
  stump: [0.32, 0.5],
}

const mulberry = (seed: number) => (n: number) => {
  const x = Math.sin(seed * 91.7 + n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Seeded scatter around an island rim. Avoids the path corridor |x| < corridorX
 * (entry/exit sit on the z axis) and the island centre.
 */
export function Scatter({
  radius = 5,
  seed = 1,
  kinds = ['tree', 'rock', 'tuft', 'flower', 'bush'],
  /** average items per kind */
  density = 1,
  /** rim band as fractions of radius: [inner, outer] */
  band = [0.55, 0.93] as [number, number],
  corridorX = 1.1,
  /** extra spots to keep clear: [x, z, radius] */
  avoid = [] as [number, number, number][],
}: {
  radius?: number
  seed?: number
  kinds?: (keyof typeof SCATTER_SETS | string)[]
  density?: number
  band?: [number, number]
  corridorX?: number
  avoid?: [number, number, number][]
}) {
  const items = useMemo(() => {
    const rnd = mulberry(seed)
    const out: { name: string; p: Vec3; ry: number; s: number; fit?: number }[] = []
    let n = 0
    for (const kind of kinds) {
      const set = SCATTER_SETS[kind]
      if (!set) continue
      const want = Math.max(1, Math.round({ tree: 5, rock: 4, tuft: 14, flower: 8, bush: 4, mushroom: 3, stump: 2 }[kind] ?? 4) * density)
      const fr = KIND_FIT[kind] ?? [0.5, 0.9]
      for (let tries = 0, placed = 0; tries < want * 8 && placed < want; tries++) {
        const a = rnd(n * 3 + 1) * Math.PI * 2
        const d = (band[0] + rnd(n * 3 + 2) * (band[1] - band[0])) * radius
        const x = Math.cos(a) * d
        const z = Math.sin(a) * d
        n++
        if (Math.abs(x) < corridorX && Math.abs(z) < radius) continue
        if (d > radius * 0.94) continue
        if (avoid.some(([ax, az, ar]) => (x - ax) ** 2 + (z - az) ** 2 < ar * ar)) continue
        const name = set[Math.floor(rnd(n * 13 + 5) * set.length)]
        out.push({
          name,
          p: [x, topY(d, radius), z],
          ry: rnd(n * 17) * Math.PI * 2,
          s: 0.85 + rnd(n * 19) * 0.3,
          fit: fr[0] + rnd(n * 23) * (fr[1] - fr[0]),
        })
        placed++
      }
    }
    return out
  }, [radius, seed, kinds, density, band, corridorX, avoid])
  return (
    <group>
      {items.map((it, i) => (
        <Prop key={i} name={it.name} position={it.p} rotation={[0, it.ry, 0]} scale={it.s} fit={it.fit} />
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */

const PALETTE_BY_ID = Object.fromEntries(LEVELS.map((l) => [l.id, l.palette]))
const v5rnd = (seed: number, n: number) => {
  const x = Math.sin(seed * 91.7 + n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/**
 * V4-style density for a V5 island, built from V4's own pieces: extra seeded
 * `scatterGeo` layers (V4's merged tufts / pebbles / blossoms / rim trees,
 * one mesh per layer) plus a handful of kit Trees / Rocks / Bushes / ClayPots
 * on the rim. The path corridor (|x| < 1.3), the stand point and the centre
 * play area stay clear. World-space: mount once per island id.
 */
export function IslandDressing5({
  id,
  layers = 3,
  seed = 13,
}: {
  id: IslandId
  /** extra scatterGeo layers on top of the base island's own scatter */
  layers?: number
  seed?: number
}) {
  const i = islandIndex(id)
  // V6 WORLD mount window: props exist only on the island underfoot plus one
  // either side; the finale pull-back dresses every island again.
  const inWindow = useWorldUI((s) => s.finale || Math.abs(s.idx - i) <= 1)
  const pal = PALETTE_BY_ID[id] ?? { ground: C.leaf, accent: C.terracotta }
  const geos = useMemo(
    () =>
      Array.from({ length: layers }, (_, k) =>
        scatterGeo({
          radius: ISLAND_R,
          ground: pal.ground,
          accent: pal.accent,
          seed: seed + k * 97,
        }),
      ).filter((g): g is THREE.BufferGeometry => !!g),
    [layers, seed, pal.ground, pal.accent],
  )
  const pieces = useMemo(() => {
    const out: { kind: number; p: Vec3; ry: number; s: number }[] = []
    let n = 0
    for (let k = 0, placed = 0; k < 80 && placed < 14; k++) {
      const a = v5rnd(seed, k * 5 + 1) * Math.PI * 2
      const d = 3.1 + v5rnd(seed, k * 5 + 2) * 1.4
      const x = Math.cos(a) * d, z = Math.sin(a) * d
      n++
      if (Math.abs(x) < 1.3) continue // path corridor
      if ((x + 0.9) ** 2 + (z - 1.4) ** 2 < 1.2 * 1.2) continue // stand point
      if (d > ISLAND_R * 0.94) continue
      out.push({
        kind: Math.floor(v5rnd(seed, n * 7 + 3) * 4),
        p: [x, topY(d, ISLAND_R) + 0.01, z],
        ry: v5rnd(seed, n * 11) * Math.PI * 2,
        s: 0.8 + v5rnd(seed, n * 13) * 0.6,
      })
      placed++
    }
    return out
  }, [seed])
  const baked = useMemo(() => piecesGeo(pieces), [pieces])
  if (!inWindow) return null
  return (
    <group position={islandPos(id)}>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} material={clayVC()} receiveShadow />
      ))}
      <mesh geometry={baked} material={clayVC()} receiveShadow />
    </group>
  )
}

/** The same primitives kit's <Tree>/<Rock>/<Bush>/<ClayPot> render, baked into
 *  ONE vertex-coloured geometry — ~50 draw calls -> 1 per dressed island. (V6) */
function piecesGeo(pieces: { p: [number, number, number]; ry: number; s: number; kind: number }[]) {
  const geos: THREE.BufferGeometry[] = []
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3(), v = new THREE.Vector3()
  const put = (g0: THREE.BufferGeometry, lx: number, ly: number, lz: number,
    x: number, y: number, z: number, ry: number, sx: number, sy: number, sz: number, hex: string) => {
    const g = g0.index ? g0.toNonIndexed() : g0
    if (g !== g0) g0.dispose()
    g.translate(lx, ly, lz)
    e.set(0, ry, 0); q.setFromEuler(e); sv.set(sx, sy, sz)
    g.applyMatrix4(m.compose(v.set(x, y, z), q, sv))
    paint(g, hex, undefined, 0.06)
    geos.push(g)
  }
  for (const it of pieces) {
    const [x, y, z] = it.p, ry = it.ry, s = it.s
    if (it.kind === 0) { // Tree (h = s * 1.5): trunk + two canopy blobs
      const h = s * 1.5
      put(new THREE.CylinderGeometry(0.06 * h, 0.08 * h, 0.5 * h, 8), 0, 0.25 * h, 0, x, y, z, ry, 1, 1, 1, C.wood)
      put(new THREE.SphereGeometry(0.38 * h, 16, 12), 0, 0.72 * h, 0, x, y, z, ry, 1, 1, 1, C.leafDark)
      put(new THREE.SphereGeometry(0.24 * h, 14, 10), 0.18 * h, 0.58 * h, 0.1 * h, x, y, z, ry, 1, 1, 1, C.leafDark)
    } else if (it.kind === 1) { // Rock
      put(new THREE.DodecahedronGeometry(1, 1), 0, 0, 0, x, y, z, ry, 0.4 * s, 0.28 * s, 0.4 * s, C.stone)
    } else if (it.kind === 2) { // Bush: three blobs
      put(new THREE.SphereGeometry(0.2, 12, 9), 0, 0.15, 0, x, y, z, ry, s, s, s, C.leafDark)
      put(new THREE.SphereGeometry(0.12, 10, 8), 0.15, 0.1, 0.05, x, y, z, ry, s, s, s, C.leafDark)
      put(new THREE.SphereGeometry(0.1, 10, 8), -0.13, 0.1, -0.04, x, y, z, ry, s, s, s, C.leafDark)
    } else { // ClayPot (s * 0.8): pot + rim + plant
      const k = s * 0.8
      put(new THREE.CylinderGeometry(0.085, 0.06, 0.11, 10), 0, 0.055, 0, x, y, z, ry, k, k, k, C.terracotta)
      put(new THREE.CylinderGeometry(0.096, 0.09, 0.035, 10), 0, 0.115, 0, x, y, z, ry, k, k, k, C.brick)
      put(new THREE.SphereGeometry(0.09, 10, 8), 0, 0.19, 0, x, y, z, ry, k, k, k, C.leafDark)
      put(new THREE.SphereGeometry(0.06, 9, 7), 0.055, 0.165, 0.03, x, y, z, ry, k, k, k, C.leaf)
    }
  }
  const merged = mergeGeometries(geos, false)!
  geos.forEach((g) => g.dispose())
  return merged
}
