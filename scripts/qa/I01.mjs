// Three slow breaths: hold the pond for a full breath in, let go to breathe out.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default async function play(page) {
  const el = await page.waitForSelector('[data-qa="breathe"]')
  const box = await el.boundingBox()
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  for (let i = 0; i < 3; i++) {
    await page.mouse.down()
    await sleep(4100)
    await page.mouse.up()
    await sleep(3100)
  }
}
