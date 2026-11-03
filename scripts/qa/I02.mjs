// Next stop: hold the lever, let go when the engine reaches each platform.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const centre = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, sel)

export default async function play(page) {
  await page.waitForSelector('[data-qa="lever"]')
  const lever = await centre(page, '[data-qa="lever"]')
  await page.mouse.move(lever.x, lever.y)
  for (let i = 0; i < 4; i++) {
    const st = await centre(page, `[data-qa="station-${i}"]`)
    if (!st) throw new Error(`station ${i} missing`)
    await page.mouse.down()
    for (let k = 0; k < 400; k++) {
      const tr = await centre(page, '[data-qa="train"]')
      if (!tr) throw new Error('train missing')
      if (tr.x >= st.x - 7) break
      await sleep(30)
    }
    await page.mouse.up()
    if (i === 3) {
      await sleep(520)
      const vp = page.viewport()
      await page.screenshot({ path: `proofs/I02-book-${vp.width}.png` })
    }
    await sleep(1700)
  }
}
