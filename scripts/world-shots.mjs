// node scripts/world-shots.mjs [baseUrl]
// World pass shots: intro sweep at 1s + 4s, a golden-hour island (lite), and the
// finale night pull-back — each at desktop 1440x900 and mobile 390x844.
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
let puppeteer
try { puppeteer = require('puppeteer-core') } catch { puppeteer = require('/tmp/pp/node_modules/puppeteer-core') }
const [base = 'http://localhost:5190/'] = process.argv.slice(2)
import { mkdirSync, rmSync, statSync } from 'fs'
const LOCK = '/tmp/gj-chrome.lock'
for (let i = 0; ; i++) {
  try { mkdirSync(LOCK); break } catch {
    try { if (Date.now() - statSync(LOCK).mtimeMs > 360000) rmSync(LOCK, { recursive: true, force: true }) } catch {}
    if (i % 12 === 0) console.log('waiting for the shared browser slot…')
    await new Promise((r) => setTimeout(r, 5000))
  }
}
const unlock = () => { try { rmSync(LOCK, { recursive: true, force: true }) } catch {} }
process.on('exit', unlock); process.on('SIGINT', () => process.exit(130)); process.on('SIGTERM', () => process.exit(143))
setTimeout(() => { console.log('world-shots hard timeout'); process.exit(3) }, 330000).unref()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ userDataDir: '/tmp/gj-chrome-profile', executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], protocolTimeout: 180000 })
const errors = []
for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  const page = await browser.newPage(); await page.setViewport(vp); page.setDefaultTimeout(120000)
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/favicon|GPU stall|WebGL|swiftshader|ReadPixels/i.test(m.text())) errors.push(`[${name}] ${m.type()}: ${m.text()}`) })
  page.on('pageerror', (e) => errors.push(`[${name}] pageerror ${e.message}`))
  await page.goto(base, { waitUntil: 'domcontentloaded' }); await page.evaluate(() => localStorage.clear())

  // intro sweep (fresh visitor, never started)
  await page.goto(base, { waitUntil: 'networkidle2' }); await sleep(1000)
  await page.screenshot({ path: `proofs/world-${name}-intro1.png` })
  await sleep(3000)
  await page.screenshot({ path: `proofs/world-${name}-intro4.png` })

  // golden-hour island (lite also proves the no-FX path)
  await page.goto(`${base}?qa&lite&at=L05`, { waitUntil: 'networkidle2' }); await sleep(3000)
  await page.screenshot({ path: `proofs/world-${name}-L05.png` })

  // finale: win L09, wait out the payoff + pull-back, night vista
  await page.goto(`${base}?qa&at=L09`, { waitUntil: 'networkidle2' }); await sleep(2000)
  await page.evaluate(() => window.__journey.win())
  await sleep(9500)
  await page.screenshot({ path: `proofs/world-${name}-finale.png` })
  await page.close()
}
await browser.close()
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors')
unlock()
