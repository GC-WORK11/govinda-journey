// node scripts/v7/coldload.mjs <url> [--runs=3] [--label=name]
// Cold time-to-playable: fresh browser context (no cache/storage) + cache disabled,
// CPU throttled 4x, at 1440x900 and 390x844(?lite). For each run reports:
//   h:playable — external heuristic, works on ANY build: first presented frame after
//     canvas exists AND the Player chunk, student.glb and the first Obstacle chunk
//     have all arrived (resource-timing). Two rAFs after the last condition ≈ first
//     frame a visitor could actually steer the traveller.
//   fj:*       — internal performance marks when the build carries them (fj:playable
//     = first useFrame tick after Player mounted + L01 modules + student.glb done).
import { withChrome, MOBILE, DESKTOP } from '../chrome.mjs'

const url = process.argv[2] || 'http://localhost:5210/'
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d
const RUNS = +arg('runs', 3)
const LABEL = arg('label', 'run')

const INSTRUMENT = `(() => {
  const w = window; w.__cold = {}
  const mark = (k) => { if (!w.__cold[k]) w.__cold[k] = Math.round(performance.now()) }
  const res = (re) => performance.getEntriesByType('resource').some((r) => re.test(r.name.split('?')[0]))
  const tick = () => {
    if (document.querySelector('canvas')) mark('canvas')
    if (res(/\\/models\\/student\\.glb$/)) mark('glb')
    if (res(/Player-[^/]+\\.js$/)) mark('playerjs')
    if (res(/Obstacle-[^/]+\\.js$/)) mark('obstacle')
    if (w.__cold.canvas && w.__cold.glb && w.__cold.playerjs && w.__cold.obstacle && !w.__cold.playWait) {
      w.__cold.playWait = 1
      requestAnimationFrame(() => requestAnimationFrame(() => mark('playable')))
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})()`

async function oneRun(ctx, u, vp, tag) {
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push('PAGEERR ' + String(e).slice(0, 120)))
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 160)) })
  await page.evaluateOnNewDocument(INSTRUMENT)
  await page.setViewport(vp)
  const cdp = await page.createCDPSession()
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.setCacheEnabled(false)
  const t0 = Date.now()
  try {
    await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction('window.__cold && window.__cold.playable', { timeout: 60000, polling: 150 })
    const out = await page.evaluate(() => {
      const marks = Object.fromEntries(performance.getEntriesByType('mark').map((m) => [m.name, Math.round(m.startTime)]))
      const nav = performance.getEntriesByType('navigation')[0]
      const res = performance.getEntriesByType('resource')
        .map((r) => ({ n: r.name.split('/').pop().slice(0, 44), t: Math.round(r.responseEnd), d: Math.round(r.duration), sz: r.transferSize || r.encodedBodySize }))
        .sort((a, b) => a.t - b.t)
      return { cold: window.__cold, marks, ttfb: Math.round(nav.responseEnd), res }
    })
    return { tag, ok: true, wall: Date.now() - t0, errs, ...out }
  } catch (e) {
    let out = {}
    try {
      out = await page.evaluate(() => ({
        cold: window.__cold,
        res: performance.getEntriesByType('resource').map((r) => r.name.split('/').pop().slice(0, 40)).join(' '),
        marks: performance.getEntriesByType('mark').map((m) => m.name + '@' + Math.round(m.startTime)).join(' '),
      }))
    } catch {}
    return { tag, ok: false, err: String(e).slice(0, 140), wall: Date.now() - t0, errs, ...out }
  } finally { await page.close().catch(() => {}) }
}

await withChrome(async (b) => {
  const jobs = [
    { tag: '1440', vp: DESKTOP, u: url },
    { tag: '390', vp: MOBILE, u: url + (url.includes('?') ? '&' : '?') + 'lite' },
  ]
  for (const j of jobs) {
    for (let i = 0; i < RUNS; i++) {
      const ctx = await b.createBrowserContext()
      const r = await oneRun(ctx, j.u, j.vp, `${j.tag}#${i + 1}`)
      await ctx.close()
      if (!r.ok) { console.log(`[${LABEL}] ${r.tag} FAIL ${r.err} cold=${JSON.stringify(r.cold)} marks=[${r.marks ?? ''}] errs=${r.errs.join('|')} res=[${r.res ?? ''}]`); continue }
      const m = r.marks
      console.log(`[${LABEL}] ${r.tag} h:playable=${r.cold.playable}ms` +
        (m['fj:playable'] ? ` fj:playable=${m['fj:playable']}ms` : '') +
        ` | glb=${r.cold.glb} playerjs=${r.cold.playerjs} obstacle=${r.cold.obstacle} canvas=${r.cold.canvas}` +
        ` | marks ${JSON.stringify(m)} | errs=${r.errs.join('|').slice(0, 300)}`)
      const heavy = r.res.filter((x) => x.sz > 40000 && x.t < r.cold.playable)
      console.log(`   heavy-before-playable: ${heavy.map((x) => `${x.n}=${(x.sz / 1024).toFixed(0)}K@${x.t}`).join(' ')}`)
    }
  }
}, { maxWaitMs: 1200000 })
process.exit(0)
