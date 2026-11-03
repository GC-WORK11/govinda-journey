// L05 "Fit the model": drag the three split pins so every laptop's slice fits its memory.
// A correct split is (5, 8, 11). Drag pin handles to the matching gaps; tap gaps as a fallback.
export default async function play(page) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const box = async (sel) => (await (await page.waitForSelector(sel, { timeout: 60000 })).boundingBox())

  const dragPin = async (pi, g) => {
    const pb = await box(`[data-qa="pin-${pi}"]`)
    const gb = await box(`[data-qa="gap-${g}"]`)
    const x = pb.x + pb.width - 14, y0 = pb.y + pb.height / 2, y1 = gb.y + gb.height / 2
    await page.mouse.move(x, y0)
    await page.mouse.down()
    for (let s = 1; s <= 8; s++) await page.mouse.move(x, y0 + ((y1 - y0) * s) / 8)
    await page.mouse.up()
    await sleep(180)
  }

  await dragPin(2, 11)
  await dragPin(1, 8)
  await dragPin(0, 5)
  await sleep(500)

  // fallback: tapping a gap moves the nearest allowed pin
  const solved = () => page.evaluate(() => window.__journey?.state().solved.includes('L05'))
  if (!(await solved())) {
    for (const g of [11, 8, 5]) { await page.click(`[data-qa="gap-${g}"]`); await sleep(200) }
  }
  await page.waitForFunction(() => window.__journey.state().solved.includes('L05'), { timeout: 45000 })
}
