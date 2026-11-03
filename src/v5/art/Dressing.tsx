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
