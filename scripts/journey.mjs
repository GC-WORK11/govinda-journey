// node scripts/journey.mjs [baseUrl] [lite]  — full in-order playthrough, desktop + mobile, using scripts/qa/<ID>.mjs
import { createRequire } from 'module'
import { existsSync, mkdirSync, rmSync, statSync } from 'fs'
import path from 'path'
const require = createRequire(import.meta.url)
let puppeteer
try { puppeteer = require('puppeteer-core') } catch { puppeteer = require('/tmp/pp/node_modules/puppeteer-core') }
const base = process.argv[2] || 'http://localhost:5190/'
const lite = process.argv[3] === 'lite' ? '&lite' : ''
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
setTimeout(() => { console.log('journey hard timeout'); process.exit(3) }, 900000).unref()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const until = async (page, fn, arg, ms = 30000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await page.evaluate(fn, arg).catch(() => false)) return true; await sleep(250) } return false }
const clickText = (page, txt) => page.evaluate((t) => { const b = [...document.querySelectorAll('button,a')].find((e) => e.textContent.trim().startsWith(t)); if (b) { b.click(); return true } return false }, txt)
const browser = await puppeteer.launch({ userDataDir: '/tmp/gj-chrome-profile', executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], protocolTimeout: 180000 })
let ok = true
for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  const errors = []
  const page = await browser.newPage(); await page.setViewport(vp); page.setDefaultTimeout(120000)
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/favicon|GPU stall|WebGL|swiftshader|ReadPixels/i.test(m.text())) errors.push(`${m.type()}: ${m.text()}`) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  await page.goto(base, { waitUntil: 'domcontentloaded' }); await page.evaluate(() => localStorage.clear())
  await page.goto(`${base}?qa${lite}`, { waitUntil: 'networkidle2' }); await sleep(3500)
  await page.screenshot({ path: `proofs/J-${name}-00-intro.png` })
  if (!(await clickText(page, 'Begin'))) errors.push('no Begin button')
  const ids = await page.evaluate(() => window.__journey.levels.map((l) => l.id ?? l))
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]
    const got = await until(page, (x) => { const s = window.__journey.state(); return s.current === x && s.phase === 'playing' }, i, 40000)
    if (!got) { errors.push(`${id}: never reached playing (${JSON.stringify(await page.evaluate(() => { const s = window.__journey.state(); return { c: s.current, p: s.phase } }))})`); break }
    await sleep(2600) // let the camera settle on the island before dragging
    await page.screenshot({ path: `proofs/J-${name}-${String(i + 1).padStart(2, '0')}-${id}-play.png` })
    const qa = path.resolve('scripts/qa', `${id}.mjs`)
    try { if (existsSync(qa)) await (await import(qa + '?t=' + Date.now())).default(page) } catch (e) { errors.push(`${id}: qa threw ${e.message}`) }
    let won = await until(page, (x) => window.__journey.state().solved.includes(x), id, 8000)
    if (!won) { errors.push(`${id}: not won by qa script, forcing`); await page.evaluate(() => window.__journey.win()) }
    await sleep(900)
    await page.screenshot({ path: `proofs/J-${name}-${String(i + 1).padStart(2, '0')}-${id}-won.png` })
    await until(page, () => window.__journey.state().phase === 'arrived', null, 8000)
    await sleep(800)
    if (i === ids.length - 1) { await sleep(7000); await page.screenshot({ path: `proofs/J-${name}-99-finale.png` }); break }
    if (!(await clickText(page, 'Walk on'))) errors.push(`${id}: no Walk on`)
  }
  console.log(`[${name}] console/flow problems: ${errors.length}`); errors.slice(0, 15).forEach((e) => console.log('   ', e.slice(0, 220)))
  if (errors.length) ok = false
  await page.close()
}
await browser.close(); console.log(ok ? 'PASS' : 'FAIL'); unlock(); process.exit(ok ? 0 : 1)
