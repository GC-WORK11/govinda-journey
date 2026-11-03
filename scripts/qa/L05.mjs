// L05 "Ent": drag each glowing layer-slab off the floating stack onto a laptop.
// Blocks are grabbed top-of-stack first so nothing occludes the pick point.
export default async function play(page) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const LAPS = [
    [-1.25, 2.12],
    [-0.4, 2.28],
    [0.45, 2.3],
    [1.15, 2.2],
  ]
  const LIFT = 0.28
  const HOMES = [[-0.35, 1.05, 0.8], [0.2, 1.22, 0.62], [0.75, 1.08, 0.72], [1.3, 1.24, 0.98]]
  const homeY = (i) => HOMES[i][1]

  await page.waitForFunction(
    () => window.__journey && window.__journey.find && window.__journey.find('block3'),
    { timeout: 60000 },
  )
  await sleep(1200) // let the blocks finish popping in

  for (let i = 0; i < 4; i++) {
    const bi = i
    const from = await page.evaluate((n) => window.__journey.find(n), `block${bi}`)
    const [lx, lz] = LAPS[i]
    const to = await page.evaluate((p) => window.__journey.project(...p), [lx, homeY(bi) + LIFT, lz])
    if (!from || !to) throw new Error(`no screen point for block${bi}`)
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    for (let s = 1; s <= 12; s++) {
      await page.mouse.move(from.x + ((to.x - from.x) * s) / 12, from.y + ((to.y - from.y) * s) / 12)
      await sleep(24)
    }
    await page.mouse.up()
    await sleep(650)
  }
  await page.waitForFunction(() => window.__journey.state().solved.includes('L05'), { timeout: 45000 })
}
