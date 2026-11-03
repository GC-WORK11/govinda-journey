// node scripts/level-check.mjs <LEVELID> [baseUrl]
// Opens the level's game at desktop + mobile, screenshots it, runs scripts/qa/<ID>.mjs, checks the level got solved.
import { createRequire } from 'module'
import { existsSync } from 'fs'
import path from 'path'
const require = createRequire(import.meta.url)
let puppeteer
try { puppeteer = require('puppeteer-core') } catch { puppeteer = require('/tmp/pp/node_modules/puppeteer-core') }
const [id, base = 'http://localhost:5190/'] = process.argv.slice(2)
if (!id) { console.error('usage: level-check.mjs <LEVELID>'); process.exit(2) }
const qaPath = path.resolve('scripts/qa', `${id}.mjs`)
const play = existsSync(qaPath) ? (await import(qaPath + '?t=' + Date.now())).default : null
// One headless Chrome at a time on this shared box: wait for the lock (stale after 6 min).
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
setTimeout(() => { console.log('level-check hard timeout'); process.exit(3) }, 330000).unref()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], protocolTimeout: 180000 })
let ok = true
for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  const errors = []
  const page = await browser.newPage(); await page.setViewport(vp); page.setDefaultTimeout(120000)
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/favicon|GPU stall|WebGL|swiftshader|ReadPixels/i.test(m.text())) errors.push(`${m.type()}: ${m.text()}`) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  await page.goto(base, { waitUntil: 'domcontentloaded' }); await page.evaluate(() => localStorage.clear())
  await page.goto(`${base}?qa&lite&at=${id}&play`, { waitUntil: 'networkidle2' }); await sleep(2500)
  await page.screenshot({ path: `proofs/${id}-${name}-game.png` })
  let won = false
  if (play) {
    try { await play(page); await sleep(2500) } catch (e) { errors.push('qa script threw: ' + e.message) }
    won = await page.evaluate((i) => window.__journey?.state().solved.includes(i), id)
    await page.screenshot({ path: `proofs/${id}-${name}-after.png` })
    await page.evaluate(() => window.__journey && document.querySelectorAll('.sheet').length && 0)
  }
  // island view after unlock
  await page.goto(`${base}?qa&lite&at=${id}`, { waitUntil: 'networkidle2' }); await sleep(3000)
  await page.screenshot({ path: `proofs/${id}-${name}-island.png` })
  console.log(`[${name}] qa script: ${play ? (won ? 'WON' : 'NOT WON') : 'missing'} | console problems: ${errors.length}`)
  errors.slice(0, 8).forEach((e) => console.log('   ', e.slice(0, 220)))
  if (!won || errors.length) ok = false
  await page.close()
}
await browser.close()
console.log(ok ? 'PASS' : 'FAIL'); unlock(); process.exit(ok ? 0 : 1)
