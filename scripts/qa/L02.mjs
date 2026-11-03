/**
 * QA script for L02 — Rejections
 * Drags the three letters into the stream slots to create stepping stones.
 */
export default async function (page) {
  const wait = (ms) => new Promise(r => setTimeout(r, ms))
  
  // Wait for the game to be ready and letters to settle
  await wait(1200)

  // Letter home positions - these need to be precise
  const letters = [
    [0.9, 0.55, 0.95],
    [1.55, 0.55, 1.05],
    [2.15, 0.55, 1.35],
  ]

  // Slot positions
  const slots = [
    [0.3, 0.6, 2.05],
    [1.0, 0.6, 2.05],
    [1.7, 0.6, 2.05],
  ]

  // Drag each letter to a slot
  for (let i = 0; i < 3; i++) {
    const letterPos = letters[i]
    const slotPos = slots[i]

    // Get screen coordinates
    const fromPx = (await page.evaluate((n) => window.__journey.find(n), `letter-${i}`)) || await page.evaluate((p) => window.__journey.project(...p), letterPos)
    const toPx = await page.evaluate((p) => window.__journey.project(...p), slotPos)

    // Drag with generous timing
    await page.mouse.move(fromPx.x, fromPx.y)
    await wait(200)
    await page.mouse.down()
    await wait(250)

    // Smooth drag in many steps
    const steps = 12
    for (let s = 1; s <= steps; s++) {
      const t = s / steps
      const x = fromPx.x + (toPx.x - fromPx.x) * t
      const y = fromPx.y + (toPx.y - fromPx.y) * t
      await page.mouse.move(x, y)
      await wait(60)
    }

    await page.mouse.up()
    await wait(700)
  }

  // Wait for the win animation
  await wait(1500)
}
