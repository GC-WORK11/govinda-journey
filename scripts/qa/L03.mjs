// L03 "Ship it by Sunday": drag the three page pieces into the browser window,
// then pull the Deploy lever. Real pointer drags only.
export default async function play(page) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const drag = async (from, to, dy = 0) => {
    const a = await (await page.waitForSelector(from)).boundingBox()
    const b = to ? await (await page.waitForSelector(to)).boundingBox() : null
    const sx = a.x + a.width / 2, sy = a.y + a.height / 2
    const ex = b ? b.x + b.width / 2 : sx, ey = b ? b.y + b.height / 2 : sy + dy
    await page.mouse.move(sx, sy)
    await page.mouse.down()
    const steps = 12
    for (let i = 1; i <= steps; i++) await page.mouse.move(sx + (ex - sx) * (i / steps), sy + (ey - sy) * (i / steps))
    await page.mouse.up()
    await sleep(650)
  }
  for (const id of ['header', 'hero', 'button']) await drag(`[data-qa="piece-${id}"]`, `[data-qa="slot-${id}"]`)
  await drag('[data-qa="lever"]', null, 90)
  await sleep(4500)
}
