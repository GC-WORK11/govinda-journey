// L07 'Wispr Wrap': tap each floating word pebble; it arcs to the laptop screen. Any order wins.
export default async function (page) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const mobile = (page.viewport()?.width || 1440) < 600
  const solved = () => page.evaluate(() => window.__journey?.state().solved.includes('L07'))
  const tapAt = async (s) => { if (mobile) await page.touchscreen.tap(s.x, s.y); else await page.mouse.click(s.x, s.y) }
  const spawns = [[-0.30, 0.62, 1.70], [0.22, 0.80, 1.88], [0.72, 0.64, 1.98], [1.25, 0.78, 1.86]]
  for (let round = 0; round < 4 && !(await solved()); round++) {
    for (let i = 0; i < spawns.length; i++) {
      if (await solved()) return
      let s = null
      for (let k = 0; k < 40 && !s; k++) {
        s = await page.evaluate(
          (n, f) => (window.__journey?.find(n) ?? window.__journey?.project(...f)) || null,
          'l07-word-' + i, spawns[i])
        if (!s) await sleep(250)
      }
      if (!s) return
      await tapAt(s)
      await sleep(650)
    }
  }
}
