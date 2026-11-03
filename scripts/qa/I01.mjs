// Three slow breaths: hold the pond for a full breath in, let go to breathe out.
// Repeats if a breath does not register (e.g. a hot reload mid-game).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default async function play(page) {
  const solved = () => page.evaluate(() => window.__journey?.state().solved.includes('I01'))
  const el = await page.waitForSelector('[data-qa="breathe"]')
  for (let i = 0; i < 8; i++) {
    if (await solved()) return
    const box = await el.boundingBox()
    if (!box) return
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await sleep(4150)
    await page.mouse.up()
    await sleep(3200)
  }
}
