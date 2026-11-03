// Place 3 air sensors on the Delhi map by clicking the glowing spots.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default async function play(page) {
  // Wait for and click all 3 sensor spots
  for (let i = 0; i < 3; i++) {
    const selector = `[data-qa="sensor-${i}"]`
    const el = await page.waitForSelector(selector, { timeout: 5000 })
    await el.click()
    await sleep(400)
  }
  
  // Wait for the haze to clear and game to complete
  await sleep(4500)
}
