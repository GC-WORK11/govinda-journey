export default async function (page) {
  for (const p of [[0.9,0.35,1.5],[1.6,0.35,0.6],[0.2,0.35,2.1]]) {
    const s = await page.evaluate((p) => window.__journey.project(...p), p)
    await page.mouse.click(s.x, s.y); await new Promise(r=>setTimeout(r,400))
  }
}
