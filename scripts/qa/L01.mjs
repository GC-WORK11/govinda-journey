// L01 'The first step': tap each of the four lanterns to light them.
export default async function (page) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const heads = [[-0.35, 0.62, 1.25], [0.45, 0.62, 1.55], [1.25, 0.62, 1.5], [-0.1, 0.62, 2.05]]
  const order = [0, 2, 1, 3] // back to front: an intercepted tap can only light an unlit lamp
  const mobile = (page.viewport()?.width || 1440) < 600
  const solved = () => page.evaluate(() => window.__journey?.state().solved.includes('L01'))
  const tapAt = async (s) => { if (mobile) await page.touchscreen.tap(s.x, s.y); else await page.mouse.click(s.x, s.y) }
  for (let round = 0; round < 3 && !(await solved()); round++) {
    for (const i of order) {
      let s = null
      for (let k = 0; k < 60 && !s; k++) {
        s = await page.evaluate(
          (n, f) => (window.__journey?.find(n) ?? window.__journey?.project(...f)) || null,
          'l01-lamp-' + i, heads[i])
        if (!s) await sleep(250)
      }
      if (!s) return
      await tapAt(s)
      await sleep(500)
      if (await solved()) return
    }
  }
}
