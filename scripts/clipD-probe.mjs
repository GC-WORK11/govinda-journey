// Minimal diagnostic: where does the audit boot stall? One page, timestamps.
import { writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { withChrome, DESKTOP } from './chrome.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const outdir = path.resolve(here, '..', 'proofs', 'v7', 'clipD')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const t0 = Date.now()
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, m)
setTimeout(() => { log('PROBE hard timeout'); process.exit(3) }, 420000).unref()

await withChrome(async (browser) => {
  log('chrome acquired')
  const page = await browser.newPage()
  log('newPage')
  await page.setViewport(DESKTOP)
  page.on('console', (m) => { const t = m.type(); if (t === 'error' || t === 'warning') log('page.' + t + ': ' + m.text().slice(0, 200)) })
  page.on('pageerror', (e) => log('pageerror: ' + String(e).slice(0, 300)))
  page.setDefaultTimeout(60000)
  await page.goto('http://localhost:5207/?qa&fresh&at=L08&unlock&nomerge', { waitUntil: 'domcontentloaded', timeout: 45000 })
  log('goto done')
  for (let i = 0; i < 60; i++) {
    const st = await page.evaluate(() => {
      const j = window.__journey || {}
      return { v5: !!j.v5, player: !!j.player, canvas: !!document.querySelector('canvas'), rs: document.readyState }
    }).catch((e) => ({ err: String(e).slice(0, 120) }))
    if (i % 10 === 0 || (st.v5 && st.player && st.canvas)) log('poll ' + JSON.stringify(st))
    if (st.v5 && st.player && st.canvas) break
    await sleep(1000)
  }
  log('import eval...')
  const r = await page.evaluate(async () => {
    const core = await import('/src/v5/core.ts')
    const lay = await import('/src/v5/world/layout.ts')
    const inp = await import('/src/v5/player/input.ts')
    let scene = null
    const climb = (o) => { let p = o; while (p.parent) p = p.parent; return p }
    for (const o of core.walkables) { const p = climb(o); if (p.isScene) { scene = p; break } }
    if (!scene) for (const o of core.blockers) { const p = climb(o); if (p.isScene) { scene = p; break } }
    let n = 0, islands = []
    scene && scene.traverse((o) => { if (o.isMesh) n++; if (o.name && o.name.startsWith('island-')) islands.push(o.name) })
    return { scene: !!scene, meshes: n, islands, walk: core.walkables.size, blk: core.blockers.size, synth: !!inp.input.synth }
  })
  log('eval result: ' + JSON.stringify(r))
  await sleep(3000)
  await page.screenshot({ path: path.join(outdir, 'probe.jpg'), type: 'jpeg', quality: 60 })
  log('screenshot done')
}, { maxWaitMs: 120000 })
log('done')
process.exit(0)
