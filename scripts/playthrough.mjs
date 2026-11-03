// node scripts/playthrough.mjs [baseUrl]
// Full play-through: intro -> every level in order -> finale, at desktop + mobile.
// Uses scripts/qa/<ID>.mjs when present, otherwise window.__journey.win() (recorded as fallback).
// Also checks "Skip to the end" from a fresh start and that a reload keeps progress.
import { createRequire } from 'module'
import { existsSync, mkdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const require = createRequire(import.meta.url)
let puppeteer
try { puppeteer = require('puppeteer-core') } catch { puppeteer = require('/tmp/pp/node_modules/puppeteer-core') }

const base = (process.argv[2] || 'http://localhost:5190/').replace(/\/?$/, '/')
const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const proofs = path.join(root, 'proofs')
mkdirSync(proofs, { recursive: true })

// One headless Chrome at a time on this shared box: wait for the lock (stale after 6 min).
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
// A full play-through outlasts the 6 min stale window, so keep the lock fresh while we hold it.
const beat = setInterval(() => { try { const now = new Date(); utimesSync(LOCK, now, now) } catch {} }, 60000)
beat.unref()
setTimeout(() => { console.log('playthrough hard timeout'); process.exit(3) }, 1800000).unref()

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pad = (n) => String(n).padStart(2, '0')
const NOISE = /favicon|GPU stall|WebGL|swiftshader|ReadPixels|Download the React DevTools/i

async function limit(promise, ms, label) {
  promise.catch(() => {})
  let timer
  try {
    return await Promise.race([promise, new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(label)), ms) })])
  } finally { clearTimeout(timer) }
}

async function findButton(page, text, scope = '') {
  const handles = await page.$$(`${scope} button`.trim())
  for (const h of handles) {
    const t = await h.evaluate((el) => el.textContent.replace(/\s+/g, ' ').trim())
    if (t === text) return h
  }
  return null
}

const qaFor = async (id) => {
  const file = path.join(here, 'qa', `${id}.mjs`)
  if (!existsSync(file)) return null
  return (await import(`${file}?t=${Date.now()}`)).default
}

const results = []
let hardFail = 0

const browser = await puppeteer.launch({ userDataDir: '/tmp/gj-chrome-profile', /* one fixed reusable profile */
  executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  protocolTimeout: 300000,
})

const VIEWPORTS = [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
]

for (const [vpName, vp] of VIEWPORTS) {
  const page = await browser.newPage()
  await page.setViewport(vp)
  page.setDefaultTimeout(120000)

  const errors = []
  let tag = 'intro'
  page.on('console', (m) => {
    if (m.type() !== 'error' || NOISE.test(m.text())) return
    errors.push({ tag, text: m.text().slice(0, 300) })
  })
  page.on('pageerror', (e) => errors.push({ tag, text: 'pageerror: ' + e.message.slice(0, 300) }))
  const errorsFor = (t) => errors.filter((e) => e.tag === t)

  console.log(`\n=== ${vpName} ${vp.width}x${vp.height} ===`)
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => localStorage.clear())
  await page.goto(`${base}?qa&lite`, { waitUntil: 'networkidle2' })
  await sleep(1800)
  await page.screenshot({ path: path.join(proofs, `play-${vpName}-00-intro.png`) })

  const levels = await page.evaluate(() => window.__journey?.levels || [])
  if (!levels.length) throw new Error('window.__journey.levels missing — is ?qa loaded?')
  console.log(`levels: ${levels.join(' ')}`)

  const begin = await findButton(page, 'Begin the walk')
  if (!begin) throw new Error('no "Begin the walk" button')
  await begin.click()
  await page.waitForFunction(() => window.__journey.state().phase === 'arrived', { timeout: 60000 })

  for (let i = 0; i < levels.length; i++) {
    const id = levels[i]
    const last = i === levels.length - 1
    tag = id
    const started = Date.now()
    const qa = await qaFor(id)
    const row = { viewport: vpName, i, id, mode: qa ? 'qa' : 'fallback', won: false, ok: true, ms: 0, error: null, console: [] }

    const routine = (async () => {
      await page.waitForFunction((n) => {
        const s = window.__journey?.state(); return s && s.phase === 'arrived' && s.current === n
      }, {}, i)
      const playBtn = await findButton(page, 'Play', '.arrive')
      if (!playBtn) throw new Error('no Play button on arrival')
      await playBtn.click()
      await page.waitForSelector('.sheet.game', { timeout: 40000 })
      await sleep(900)
      if (qa) await qa(page)
      else await page.evaluate(() => window.__journey.win())
      // The win must register before the panel can appear; fail fast instead of waiting out a dead panel.
      const solved = await page.waitForFunction(
        (lid) => window.__journey.state().solved.includes(lid),
        { timeout: 25000, polling: 250 }, id).then(() => true, () => false)
      if (!solved) throw new Error(qa ? 'QA script finished but the level did not win' : 'fallback win() did not register')
      await page.waitForSelector('.sheet.panel', { timeout: 30000 })
      await page.waitForFunction(() => window.__journey.state().phase === 'panel', { timeout: 30000 })
      await sleep(1600)
      return true
    })()

    try {
      row.won = await limit(routine, 90000, 'level gave up after 90s')
    } catch (e) {
      row.ok = false
      row.error = e.message
      console.log(`  ${id}: ${e.message} — recovering so the walk can continue`)
      try {
        await limit(page.evaluate((lid) => {
          const j = window.__journey, s = j.state()
          s.solve(lid); s.setPhase('panel')
        }, id), 20000, 'recovery timed out')
        row.won = false
      } catch (e2) { row.error += ' / recovery: ' + e2.message; hardFail++ }
    }
    row.ms = Date.now() - started
    row.console = errorsFor(id).map((e) => e.text)

    await page.screenshot({ path: path.join(proofs, `play-${vpName}-${pad(i + 1)}-${id}.png`) })
    if (!row.won) await page.screenshot({ path: path.join(proofs, `play-${vpName}-${pad(i + 1)}-${id}-not-won.png`) })

    if (!row.won) row.ok = false
    results.push(row)
    console.log(`  ${pad(i + 1)} ${id}  ${row.mode.padEnd(8)} ${row.won ? 'WON ' : 'MISS'}  ${(row.ms / 1000).toFixed(1)}s  errors=${row.console.length}${row.error ? '  ' + row.error : ''}`)

    if (last) {
      await page.screenshot({ path: path.join(proofs, `play-${vpName}-finale.png`) })
      continue
    }
    try {
      const walkBtn = await findButton(page, 'Walk on', '.sheet.panel')
      if (!walkBtn) throw new Error('no "Walk on" in panel')
      await walkBtn.click()
      await page.waitForFunction((n) => {
        const s = window.__journey?.state(); return s && s.phase === 'arrived' && s.current === n
      }, { timeout: 60000 }, i + 1)
    } catch (e) {
      row.ok = false
      row.error = (row.error ? row.error + ' / ' : '') + 'walk on failed: ' + e.message
      console.log(`  ${id}: walk on failed (${e.message})`)
      // Put the walk back on a level so the rest of the run is still exercised.
      await limit(page.evaluate((n) => {
        const s = window.__journey.state(); s.goto(n); s.setPhase('arrived')
      }, i + 1), 20000, 'walk recovery timed out').catch(() => {})
    }
  }

  // Fresh start -> "Skip to the end" -> reload keeps progress.
  tag = 'skip'
  console.log('  -- skip to the end + reload --')
  const skip = { viewport: vpName, skipOk: false, skipVisible: false, reloadOk: false, usable: false, detail: null }
  try {
    await page.goto(base, { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => localStorage.clear())
    await page.goto(`${base}?qa&lite`, { waitUntil: 'networkidle2' })
    await sleep(1500)
    const begin2 = await findButton(page, 'Begin the walk')
    if (!begin2) throw new Error('no "Begin the walk" on fresh start')
    await begin2.click()
    await page.waitForFunction(() => window.__journey.state().phase === 'arrived', { timeout: 60000 })
    const skipBtn = await page.$('button.link.skip')
    if (!skipBtn) throw new Error('no "Skip to the end" button')
    skip.skipVisible = await skipBtn.evaluate((el) => !!(el.offsetWidth || el.offsetHeight))
    try { await skipBtn.click() } catch { await skipBtn.evaluate((el) => el.click()) }
    await page.waitForFunction(() => {
      const s = window.__journey.state(); return s.phase === 'arrived' && s.current === window.__journey.levels.length - 1
    }, { timeout: 60000 })
    skip.skipOk = true
    await sleep(1800)
    await page.screenshot({ path: path.join(proofs, `play-${vpName}-skip-end.png`) })

    const before = await page.evaluate(() => {
      const s = window.__journey.state(); return { current: s.current, solved: s.solved.length, started: s.started }
    })
    await page.reload({ waitUntil: 'networkidle2' })
    await sleep(2500)
    const after = await page.evaluate(() => {
      const s = window.__journey?.state()
      return {
        current: s?.current, solved: s?.solved.length, started: s?.started, phase: s?.phase,
        stored: !!localStorage.getItem('govinda-journey-v1'),
        arrive: !!document.querySelector('.arrive'), panel: !!document.querySelector('.sheet.panel'),
        intro: !!document.querySelector('.intro'),
        visibleButtons: [...document.querySelectorAll('button')].filter((b) => b.offsetWidth || b.offsetHeight).map((b) => b.textContent.replace(/\s+/g, ' ').trim()),
      }
    })
    skip.reloadOk = !!after.stored && after.solved === before.solved && after.current === before.current
    skip.usable = !!(after.arrive || after.panel)
    skip.detail = { before, after }
    await page.screenshot({ path: path.join(proofs, `play-${vpName}-after-reload.png`) })
    console.log(`  skip: ${skip.skipOk ? 'ok' : 'FAIL'} (visible: ${skip.skipVisible}) | reload keeps progress: ${skip.reloadOk ? 'yes' : 'NO'} | usable after reload: ${skip.usable ? 'yes' : 'NO'}`)
    console.log(`  after reload: phase=${after.phase} current=${after.current} solved=${after.solved} arrive=${after.arrive} intro=${after.intro}`)
  } catch (e) {
    skip.detail = { error: e.message }
    console.log(`  skip/reload check failed: ${e.message}`)
  }
  skip.console = errorsFor('skip').map((e) => e.text)
  results.push({ ...skip, id: 'SKIP', mode: 'skip', won: skip.skipOk && skip.reloadOk && skip.usable })
  if (!(skip.skipOk && skip.reloadOk && skip.usable)) hardFail++

  await page.close()
}

await browser.close()
clearInterval(beat)
unlock()

// ---- report ----
const outFile = path.join(proofs, 'playthrough-results.json')
writeFileSync(outFile, JSON.stringify(results, null, 2))
const rows = results.filter((r) => r.id !== 'SKIP')
console.log('\nID   desktop                          mobile')
for (const id of [...new Set(rows.map((r) => r.id))]) {
  const d = rows.find((r) => r.id === id && r.viewport === 'desktop')
  const m = rows.find((r) => r.id === id && r.viewport === 'mobile')
  const fmt = (r) => (r ? `${r.mode}/${r.won ? 'WON' : 'MISS'}/e${r.console.length}` : '-')
  console.log(`${id}  ${fmt(d).padEnd(30)}  ${fmt(m)}`)
}
const fails = results.filter((r) => !r.ok)
console.log(`\nlevels run: ${rows.length} | failures: ${fails.length}${hardFail ? ` | hard failures: ${hardFail}` : ''}`)
for (const f of fails) console.log(`  FAIL ${f.viewport} ${f.id}: ${f.error || (f.id === 'SKIP' ? 'skip/reload check' : 'not won')}`)
console.log(`results: ${outFile}`)
process.exit(fails.length ? 1 : 0)
