// Chalk: tap the pebble with the right answer (7); it flies onto the board and the gate opens.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default async function play(page) {
  // Wait for Pop animations to complete
  await sleep(1100)

  // The middle pebble (answer 7) is named L09-ans-7; fall back to its island-local point.
  let p = await page.evaluate(() => window.__journey.find('L09-ans-7'))
  if (!p) p = await page.evaluate((q) => window.__journey.project(...q), [0.5, 0.62, 1.8])
  await page.mouse.click(p.x, p.y)

  // Wait for the fly-in, chalk tick, chime and gate opening
  await sleep(2400)
}
