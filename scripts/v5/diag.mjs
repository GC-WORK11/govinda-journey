// minimal boot diagnostic: what stops the world from registering walkables?
import { withChrome, DESKTOP } from '../chrome.mjs'
const URL = process.argv[2] || 'http://localhost:5304/?qa&fresh&nomerge&lite'
await withChrome(async (b) => {
  const p = await b.newPage()
  await p.setViewport(DESKTOP)
  const errs = []
  p.on('pageerror', (e) => errs.push('PAGEERR ' + String(e).slice(0, 200)))
  p.on('console', (m) => { if (m.type() === 'error') errs.push('CONS ' + m.text().slice(0, 200)) })
  p.on('requestfailed', (r) => errs.push('REQFAIL ' + r.url().slice(-80) + ' ' + (r.failure()?.errorText || '')))
  await p.goto(URL, { waitUntil: 'domcontentloaded' })
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 8000))
    const st = await p.evaluate(async () => {
      try {
        const c = await import('/src/v5/core.ts')
        return {
          walk: c.walkables.size, block: c.blockers.size,
          done: c.useV5.getState().done?.length, ready: c.useV5.getState().ready,
          islands: [...document.querySelectorAll('canvas')].length,
          fj: window.__fj || null,
        }
      } catch (e) { return { err: String(e).slice(0, 300) } }
    }).catch((e) => ({ evalErr: String(e).slice(0, 160) }))
    console.log(`t=${(i + 1) * 8}s`, JSON.stringify(st))
    if (st.walk > 0) break
  }
  console.log('--- errors ---')
  for (const e of [...new Set(errs)].slice(0, 25)) console.log(e)
  await p.screenshot({ path: 'proofs/v5/diag.png' }).catch(() => {})
}, { maxWaitMs: 45 * 60000 })
