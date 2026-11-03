// L03 "First websites": drag each page piece (header, picture, button) onto its
// glowing outline on the easel's browser frame. Real pointer drags on the canvas.
export default async function play(page) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const find = async (n) => {
    for (let i = 0; i < 60; i++) {
      const p = await page.evaluate((name) => window.__journey?.find(name), n)
      if (p) return p
      await sleep(250)
    }
    throw new Error('not found: ' + n)
  }
  for (const id of ['header', 'picture', 'button']) {
    const a = await find(`L03-piece-${id}`)
    const b = await find(`L03-slot-${id}`)
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    for (let i = 1; i <= 14; i++) {
      await page.mouse.move(a.x + (b.x - a.x) * (i / 14), a.y + (b.y - a.y) * (i / 14))
      await sleep(30)
    }
    await page.mouse.up()
    await sleep(800)
  }
  await sleep(3500) // page-goes-live payoff, then the world resolves the win
}
