/**
 * QA script for I01 — Stillness
 * Hold anywhere for three full breaths (2.5s each), releasing between each breath.
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default async function play(page) {
  await sleep(800)

  // Project the lotus position to get a point to click
  const lotusPos = [0, 0.12, -0.75]
  const centerPx = await page.evaluate((p) => window.__journey.project(...p), lotusPos)

  // Three breaths: hold for 2.8s (slightly more than 2.5s needed), release, wait, repeat
  for (let breath = 0; breath < 3; breath++) {
    await page.mouse.move(centerPx.x, centerPx.y)
    await sleep(100)
    
    // Hold down (breathe in)
    await page.mouse.down()
    await sleep(2800)
    
    // Release (breathe out)
    await page.mouse.up()
    await sleep(800)
  }

  // Wait for win animation
  await sleep(1500)
}
