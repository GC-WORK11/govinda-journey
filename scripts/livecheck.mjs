// node scripts/livecheck.mjs <jobs.txt> — like shotbatch, also logs console errors + canvas presence.
import { readFileSync } from 'node:fs'
import { withChrome, MOBILE, DESKTOP } from './chrome.mjs'
const jobs = readFileSync(process.argv[2], 'utf8').trim().split('\n').map((l) => l.split('\t'))
await withChrome(async (b) => {
  for (const [out, url, size] of jobs) {
    const p = await b.newPage(); const errs = []
    p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)) })
    p.on('pageerror', (e) => errs.push('PAGEERR ' + String(e).slice(0, 160)))
    p.on('requestfailed', (r) => errs.push('REQFAIL ' + r.url().slice(0, 100)))
    try {
      await p.setViewport(size === '390x844' ? MOBILE : DESKTOP)
      await p.goto(url, { waitUntil: 'networkidle2', timeout: 90000 }); await new Promise((r) => setTimeout(r, +(process.env.WAIT || 12000)))
      const info = await p.evaluate(() => { const c = document.querySelector('canvas'); return { canvas: c ? `${c.width}x${c.height}` : null, gl: !!(c && (c.getContext('webgl2') || c.getContext('webgl'))), assets: [...document.scripts].map((s) => s.src.split('/').pop()).filter(Boolean).join(',') } })
      await p.screenshot({ path: out }); console.log('ok', out, JSON.stringify(info), 'errors=' + errs.length, errs.join(' | '))
    } catch (e) { console.log('ERR', out, String(e).slice(0, 120), errs.join(' | ')) } finally { await p.close() }
  }
}, { maxWaitMs: 1800000 })
process.exit(0)
