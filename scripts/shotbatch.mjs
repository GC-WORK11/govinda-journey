// node scripts/shotbatch.mjs <jobs.txt>  — lines: out.png<TAB>url<TAB>size(390x844|1440x900). One Chrome via the lock. env WAIT ms (default 10000).
import { readFileSync } from 'node:fs'
import { withChrome, MOBILE, DESKTOP } from './chrome.mjs'
const jobs = readFileSync(process.argv[2], 'utf8').trim().split('\n').map((l) => l.split('\t'))
await withChrome(async (b) => {
  for (const [out, url, size] of jobs) {
    const p = await b.newPage()
    try {
      await p.setViewport(size === '390x844' ? MOBILE : DESKTOP)
      await p.goto(url, { waitUntil: 'networkidle2', timeout: 90000 }); await new Promise((r) => setTimeout(r, +(process.env.WAIT || 10000)))
      await p.screenshot({ path: out }); console.log('ok', out)
    } catch (e) { console.log('ERR', out, String(e).slice(0, 120)) } finally { await p.close() }
  }
}, { maxWaitMs: 3600000 })
process.exit(0)
