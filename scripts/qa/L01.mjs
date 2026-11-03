// L01 "Light the lamps": tap each of the four lamps, then wait for dawn -> onWin.
export default async function play(page) {
  await page.waitForSelector('[data-qa="lamp-0"]', { visible: true })
  for (let i = 0; i < 4; i++) {
    const el = await page.waitForSelector(`[data-qa="lamp-${i}"]`)
    const box = await el.boundingBox()
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await new Promise((r) => setTimeout(r, 350))
  }
  await page.waitForFunction(
    () => window.__journey && window.__journey.state().solved.includes('L01'),
    { timeout: 10000 })
}
