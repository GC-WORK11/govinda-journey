// Usage: node scripts/shoot.mjs <url> <outPrefix> [steps]
// Takes desktop (1440x900) + mobile (390x844) screenshots. Collects console errors.
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
let puppeteer
try { puppeteer = require('puppeteer-core') } catch { puppeteer = require('/tmp/pp/node_modules/puppeteer-core') }
const [url = 'http://localhost:5191/', out = 'proofs/shot'] = process.argv.slice(2)
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const errors = []
for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  const page = await browser.newPage(); await page.setViewport(vp)
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] ${m.text()}`) })
  page.on('pageerror', (e) => errors.push(`[${name}] pageerror ${e.message}`))
  page.setDefaultTimeout(120000)
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
  await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 3500))
  await page.screenshot({ path: `${out}-${name}-intro.png` })
  const click = async (text) => page.evaluate((t) => { const b = [...document.querySelectorAll('button,a')].find((x) => x.textContent.trim() === t); b?.click(); return !!b }, text)
  await click('Begin the walk'); await new Promise((r) => setTimeout(r, 2500))
  await page.screenshot({ path: `${out}-${name}-L01.png` })
  await page.close()
}
await browser.close()
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors')
