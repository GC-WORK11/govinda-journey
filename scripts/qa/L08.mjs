/**
 * QA for L08 "Sign Flow": for each of 3 rounds, find which ghost pose the laptop
 * shows (named mesh l08-ghost-<pose>), then tap the matching l08-hand-<pose>
 * (a fat invisible hit-sphere at the palm). Retries until the ghost advances.
 */
export default async function play(page) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const POSES = ['palm', 'fist', 'peace', 'point']
  const touch = page.viewport() && page.viewport().hasTouch
  const tapAt = async (x, y) => {
    if (touch) { await page.touchscreen.tap(x, y); return }
    await page.mouse.move(x, y)
    await sleep(60)
    await page.mouse.down()
    await sleep(60)
    await page.mouse.up()
  }
  const find = (n) => page.evaluate((nm) => window.__journey.find(nm), n)
  const ghostPose = async () => {
    for (const p of POSES) if (await find('l08-ghost-' + p)) return p
    return null
  }
  await sleep(1500)
  for (let round = 0; round < 3; round++) {
    let cleared = false
    for (let tries = 0; tries < 14 && !cleared; tries++) {
      const target = await ghostPose()
      if (!target) { await sleep(300); continue }
      const pt = await find('l08-hand-' + target)
      if (pt) await tapAt(pt.x, pt.y)
      // wait for the fly-in + re-deal, then see if the ghost moved on
      for (let k = 0; k < 10 && !cleared; k++) {
        await sleep(250)
        const now = await ghostPose()
        if (now !== target) cleared = true
      }
    }
    if (!cleared) throw new Error('round ' + round + ' never cleared')
  }
  await sleep(1500)
}
