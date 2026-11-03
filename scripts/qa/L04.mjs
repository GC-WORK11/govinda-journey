// L04: drag each sensor puck from beside the traveller onto a glowing street spot.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const HOMES = [[-1.92, 0.16, 1.18], [-1.5, 0.16, 1.82], [-0.86, 0.16, 2.02]]
const SPOTS = [[-0.45, 0.08, 0.35], [0.5, 0.08, 1.9], [1.95, 0.08, 1.32]]
const PLANE = 0.26

const cursor = (page) => page.evaluate(() => document.body.style.cursor)

// find a screen point where the puck actually shows a grab cursor
async function grabPoint(page, a) {
  const offs = [[0, 0], [0, 8], [0, -8], [8, 0], [-8, 0], [0, 16], [0, -16], [12, 8], [-12, 8]]
  for (const [dx, dy] of offs) {
    await page.mouse.move(a.x + dx, a.y + dy)
    await sleep(90)
    if ((await cursor(page)) === 'grab') return { x: a.x + dx, y: a.y + dy }
  }
  return a
}

export default async function play(page) {
  for (let i = 0; i < 80; i++) {
    const ready = await page.evaluate(() => !!window.__journey?.find?.('L04-sensor-2'))
    if (ready) break
    await sleep(250)
  }
  await sleep(600)

  // any sensor fits any spot: fill each spot with whichever sensor is still at home
  // (on some framings two pucks overlap on screen, so the grab can pick a neighbour)
  const at = (p) => page.evaluate((q) => window.__journey.project(...q), p)
  const where = (n) => page.evaluate((x) => window.__journey.find(x), n)
  for (let j = 0; j < 3; j++) {
    const b = await at([SPOTS[j][0], PLANE, SPOTS[j][2]])
    for (let attempt = 0; attempt < 4; attempt++) {
      let i = -1
      for (let k = 0; k < 3; k++) {
        const h = await at(HOMES[k]); const n = await where('L04-sensor-' + k)
        if (n && Math.hypot(n.x - h.x, n.y - h.y) < 18) { i = k; break }
      }
      if (i < 0) break
      const a = await grabPoint(page, await at([HOMES[i][0], 0.24, HOMES[i][2]]))
      console.log(`L04 spot ${j}: grab ${a.x | 0},${a.y | 0} -> ${b.x | 0},${b.y | 0}`)
      await page.mouse.move(a.x, a.y)
      await sleep(120)
      await page.mouse.down()
      await sleep(140)
      for (let s = 1; s <= 12; s++) {
        await page.mouse.move(a.x + ((b.x - a.x) * s) / 12, a.y + ((b.y - a.y) * s) / 12)
        await sleep(40)
      }
      await sleep(200)
      await page.mouse.up()
      await sleep(900)
      let filled = false
      for (let k = 0; k < 3; k++) {
        const n = await where('L04-sensor-' + k)
        if (n && Math.hypot(n.x - b.x, n.y - b.y) < 60) filled = true
      }
      if (filled) break
      console.log(`L04: spot ${j} still empty, retrying`)
      await sleep(400)
    }
    if (j === 2) {
      await sleep(350)
      await page.screenshot({ path: `proofs/L04-payoff-${page.viewport().width}.png` })
    }
  }
  await sleep(1200)
}
