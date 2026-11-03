// node scripts/v5/play.mjs [baseUrl] [--lite] [--only=L01,L02] [--size=1440|390]
// V5 end-to-end walkthrough QA (see docs/briefs5/QA.md):
//   opens /?qa (V5), clears localStorage key govinda-journey-v5, then for each island in
//   V5_ORDER: walks with real key presses (desktop) or the virtual joystick (mobile) from
//   ENTRY toward the obstacle, calls window.__journey.solve[ID]() when present, falls back
//   to pressing E on real interactables, asserts useV5.done includes ID and the GRANTS
//   ability was granted, walks across the bridge to the next island, and screenshots
//   proofs/v5/<size>-<n>-<ID>.png. FAIL lines are printed and the run keeps going.
// Shares the single box Chrome: profile /tmp/gj-chrome-profile + /tmp/gj-chrome.lock dir lock.
import { createRequire } from 'module'
import { existsSync, mkdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const require = createRequire(import.meta.url)
let puppeteer
try { puppeteer = require('puppeteer-core') } catch { puppeteer = require('/tmp/pp/node_modules/puppeteer-core') }

// ---- args ------------------------------------------------------------------
const argv = process.argv.slice(2)
const base = (argv.find((a) => !a.startsWith('--')) || 'http://localhost:5190/').replace(/\/?$/, '/')
const flag = (n) => argv.includes('--' + n)
const opt = (n) => (argv.find((a) => a.startsWith('--' + n + '=')) || '').split('=')[1]
const LITE = flag('lite') ? '&lite' : ''
const ONLY = opt('only') ? opt('only').split(',') : null
const SIZE = opt('size') || 'both'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..', '..')
const outdir = path.join(root, 'proofs', 'v5')
mkdirSync(outdir, { recursive: true })

// ---- shared-Chrome lock (same as /tmp/gj-liveshot.mjs, plus heartbeat so a long
// run does not look stale) ----------------------------------------------------
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
const beat = setInterval(() => { try { const now = new Date(); utimesSync(LOCK, now, now) } catch {} }, 60000)
beat.unref()
setTimeout(() => { console.log('v5 play hard timeout'); process.exit(3) }, 1500000).unref()

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pad = (n) => String(n).padStart(2, '0')
const NOISE = /favicon|GPU stall|WebGL|swiftshader|ReadPixels|Download the React DevTools|deprecation/i

// ---- in-page helpers (all read the LIVE game modules via vite's module map) --
const CORE = `/src/v5/core.ts`
const LAYOUT = `/src/v5/world/layout.ts`
async function core(page, fn, arg) {
  return page.evaluate(async ({ src, f, a }) => {
    const c = await import(src)
    const body = new Function('c', 'a', `return (${f})(c, a)`)
    return body(c, a)
  }, { src: CORE, f: fn.toString(), a: arg })
}
const v5pos = (page) => core(page, (c) => {
  const p = c.player
  return { x: p.pos.x, y: p.pos.y, z: p.pos.z, frozen: p.frozen, grounded: p.grounded, island: p.island, carrying: p.carrying }
})
const v5state = (page) => core(page, (c) => {
  const s = c.useV5.getState()
  return { done: [...s.done], abilities: [...s.abilities], caption: s.caption }
})
const v5layout = (page) => page.evaluate(async (src) => {
  try {
    const l = await import(src)
    return {
      R: l.ISLAND_R,
      entry: { x: l.ENTRY.x, y: l.ENTRY.y, z: l.ENTRY.z },
      exit: { x: l.EXIT.x, y: l.EXIT.y, z: l.EXIT.z },
      pos: l.ISLAND_POS.map((v) => ({ x: v.x, y: v.y, z: v.z })),
    }
  } catch { return null }
}, LAYOUT)
const v5world = (page) => page.evaluate(async (src) => {
  const c = await import(src)
  return { walkables: c.walkables.size, blockers: c.blockers.size, interactables: c.interactables.size }
}, CORE)
const v5interactables = (page, center) => core(page, (c, ctr) => {
  const out = []
  for (const [id, it] of c.interactables) {
    try {
      const p = it.at()
      const d = Math.hypot(p.x - ctr.x, p.z - ctr.z)
      if (d < 9) out.push({ id, x: p.x, y: p.y, z: p.z, radius: it.radius, label: it.label, enabled: !it.enabled || !!it.enabled() })
    } catch { }
  }
  return out
}, center)
const hooks = (page) => page.evaluate(() => {
  const j = window.__journey || {}
  return { v5: !!j.v5, goto: !!(j.v5 && j.v5.goto), complete: !!(j.v5 && j.v5.complete),
    solve: j.solve ? Object.keys(j.solve) : [], player: j.player ? Object.keys(j.player) : [] }
})
const fps = (page) => page.evaluate(() => new Promise((r) => {
  let n = 0; const t0 = performance.now()
  const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(Math.round(n / 3)) }
  requestAnimationFrame(f)
}))

// ---- input drivers ----------------------------------------------------------
// Movement is camera-relative, so we never guess key->world mapping: probe the 4
// directions, hold the one that closes distance to the target, re-probe when it
// stops working. Touch driver does the same with 8 joystick directions.
const KEY_DIRS = ['KeyW', 'KeyA', 'KeyS', 'KeyD']
const TOUCH_DIRS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]

function keyDriver(page) {
  let held = null
  return {
    kind: 'keys',
    async burst(dir, ms) { await page.keyboard.down(dir); await sleep(ms); await page.keyboard.up(dir) },
    async hold(dir) { if (held === dir) return; if (held) await page.keyboard.up(held); held = dir; await page.keyboard.down(dir) },
    async release() { if (held) { await page.keyboard.up(held); held = null } },
    async jump() { await page.keyboard.down('Space'); await sleep(120); await page.keyboard.up('Space') },
    async use() { await page.keyboard.press('KeyE') },
    dirs: KEY_DIRS,
  }
}
function touchDriver(page, vp) {
  const jx = Math.round(vp.width * 0.27), jy = Math.round(vp.height * 0.70), rad = 64
  let touching = false, cur = [0, -1]
  const mv = async (d) => { cur = d; try { await page.touchscreen.touchMove(jx + d[0] * rad, jy + d[1] * rad) } catch {} }
  return {
    kind: 'touch',
    async burst(dir, ms) {
      if (!touching) { await page.touchscreen.touchStart(jx, jy); touching = true; await sleep(60) }
      await mv(dir); await sleep(ms)
    },
    async hold(dir) { if (!touching) { await page.touchscreen.touchStart(jx, jy); touching = true; await sleep(60) } await mv(dir) },
    async nudge() { if (touching) await mv(cur) }, // keep-alive while held
    async release() { if (touching) { try { await page.touchscreen.touchEnd() } catch {} touching = false } },
    async jump() { await tapButton(page, /jump|hop/i, 'right') },
    async use() { await tapButton(page, null, 'right') },
    dirs: TOUCH_DIRS,
  }
}
// best-effort tap of an on-screen control (mobile use/jump buttons): prefers a visible
// element whose text/aria-label matches `re` in the wanted half of the screen.
async function tapButton(page, re, half) {
  const pt = await page.evaluate(({ reSrc, half }) => {
    const els = [...document.querySelectorAll('button, [role="button"], [data-qa]')]
    const re = reSrc ? new RegExp(reSrc, 'i') : null
    const vis = els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 12 && r.height > 12 })
    const zone = (r) => half === 'right' ? r.x > innerWidth * 0.5 && r.y > innerHeight * 0.4 : r.x < innerWidth * 0.5
    const cand = vis.filter((e) => {
      const r = e.getBoundingClientRect(); if (!zone(r)) return false
      const t = `${e.getAttribute('aria-label') || ''} ${e.getAttribute('data-qa') || ''} ${e.textContent || ''}`
      return re ? re.test(t) : r.width < 140 && r.height < 140
    })
    cand.sort((a, b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y)
    const r = cand[0] && cand[0].getBoundingClientRect()
    return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null
  }, { reSrc: re ? re.source : null, half })
  if (pt) { try { await page.touchscreen.tap(pt.x, pt.y); return true } catch { try { await page.mouse.click(pt.x, pt.y); return true } catch {} } }
  return false
}

// ---- walking ---------------------------------------------------------------
const d2 = (p, t) => Math.hypot(p.x - t.x, p.z - t.z)

// Walk toward world target {x,z} using real inputs. Returns {ok, blocked, frozen, pos}.
async function walkTo(page, drv, target, { timeout = 14000, arrive = 0.9, hop = true } = {}) {
  const t0 = Date.now()
  let lastD = Infinity, lastImprove = Date.now(), probes = 0, held = null, stuckHops = 0
  while (Date.now() - t0 < timeout) {
    const p = await v5pos(page)
    const d = d2(p, target)
    if (d < arrive) { await drv.release(); return { ok: true, pos: p } }
    if (p.frozen) { await drv.release(); return { ok: false, frozen: true, pos: p } }
    if (d < lastD - 0.04) { lastD = d; lastImprove = Date.now(); stuckHops = 0 }
    const stale = Date.now() - lastImprove > (probes === 0 ? 500 : 800)
    if (!held || stale) {
      // probe all directions: short burst each, keep the best distance-gainer
      await drv.release()
      let best = null
      for (const dir of drv.dirs) {
        const a = await v5pos(page); const da = d2(a, target)
        if (da < arrive) { await drv.release(); return { ok: true, pos: a } }
        await drv.burst(dir, drv.kind === 'keys' ? 230 : 260)
        const b = await v5pos(page)
        const gain = da - d2(b, target)
        if (p.frozen || b.frozen) { await drv.release(); return { ok: false, frozen: true, pos: b } }
        if (!best || gain > best.gain) best = { dir, gain, p: b }
      }
      probes++
      if (!best || best.gain < 0.05) {
        // nothing moved us closer: probably blocked. Try a hop over a low lip, then give up.
        if (hop && stuckHops < 2) { stuckHops++; await drv.hold(best ? best.dir : drv.dirs[0]); await drv.jump(); await sleep(450); continue }
        await drv.release()
        return { ok: false, blocked: true, pos: best ? best.p : p }
      }
      held = best.dir
      await drv.hold(held)
      lastD = d2(best.p, target); lastImprove = Date.now()
    } else {
      if (drv.nudge) await drv.nudge()
      await sleep(120)
    }
  }
  await drv.release()
  return { ok: false, timeout: true, pos: await v5pos(page) }
}

// ---- misc ------------------------------------------------------------------
async function shot(page, file) { try { await page.screenshot({ path: path.join(outdir, file) }) } catch (e) { console.log('  shot failed: ' + e.message) } }
async function pressUse(page, drv, it) {
  if (drv.kind === 'keys') { await page.keyboard.press('KeyE'); await sleep(120); await page.keyboard.press('Enter') }
  else if (!(await tapButton(page, it && it.label ? new RegExp(it.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null, 'right'))) await tapButton(page, null, 'right')
}

const results = []
const rec = (r) => { results.push(r); console.log(`  ${r.ok ? 'PASS' : 'FAIL'} ${r.size} ${r.id}${r.detail ? ' — ' + r.detail : ''}`) }

// ---------------------------------------------------------------------------
const browser = await puppeteer.launch({
  userDataDir: '/tmp/gj-chrome-profile', executablePath: '/usr/bin/google-chrome', headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  protocolTimeout: 300000,
})

const VIEWPORTS = [
  ['1440', { width: 1440, height: 900 }],
  ['390', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
].filter(([n]) => SIZE === 'both' || n === SIZE)

let ORDER = null, GRANTS = null
for (const [size, vp] of VIEWPORTS) {
  const page = await browser.newPage()
  await page.setViewport(vp)
  page.setDefaultTimeout(120000)
  const errors = []
  let tag = 'boot'
  page.on('console', (m) => { if (m.type() === 'error' && !NOISE.test(m.text())) errors.push({ tag, text: m.text().slice(0, 300) }) })
  page.on('pageerror', (e) => errors.push({ tag, text: 'pageerror: ' + e.message.slice(0, 300) }))
  const errorsFor = (t) => errors.filter((e) => e.tag === t).map((e) => e.text)

  console.log(`\n=== v5 ${size} ${vp.width}x${vp.height} ===`)
  // fresh state: clear the persisted v5 store, reload so zustand rehydrates empty
  await page.goto(base, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.evaluate(() => localStorage.removeItem('govinda-journey-v5'))
  await page.goto(`${base}?qa${LITE}`, { waitUntil: 'networkidle2' })

  // wait until the V5 world is live: walkables registered or WORLD's ?qa hook up
  let ready = false
  for (let t = 0; t < 40 && !ready; t++) {
    ready = await page.evaluate(async (src) => {
      try { const c = await import(src); if (c.walkables.size > 0) return true } catch {}
      return !!(window.__journey && window.__journey.v5)
    }, CORE).catch(() => false)
    if (!ready) await sleep(750)
  }
  if (!ready) {
    // maybe routing is still behind ?v5
    await page.goto(`${base}?v5&qa${LITE}`, { waitUntil: 'networkidle2' })
    for (let t = 0; t < 40 && !ready; t++) {
      ready = await page.evaluate(async (src) => {
        try { const c = await import(src); if (c.walkables.size > 0) return true } catch {}
        return !!(window.__journey && window.__journey.v5)
      }, CORE).catch(() => false)
      if (!ready) await sleep(750)
    }
  }
  if (!ready) {
    rec({ size, id: 'BOOT', ok: false, detail: 'V5 world not mounted (no core.walkables, no __journey.v5) — is ?qa routed to V5?' })
    await shot(page, `${size}-00-nov5.png`)
    await page.close()
    continue
  }

  ORDER = await core(page, (c) => [...c.V5_ORDER])
  GRANTS = await core(page, (c) => ({ ...c.GRANTS }))
  const lay = await v5layout(page)
  if (!lay) { rec({ size, id: 'BOOT', ok: false, detail: 'src/v5/world/layout.ts not importable' }); await page.close(); continue }

  // deterministic start: reset store, stand at L01 ENTRY
  await core(page, (c) => { c.useV5.getState().reset() })
  const e0 = { x: lay.pos[0].x + lay.entry.x, y: lay.pos[0].y + lay.entry.y + 0.3, z: lay.pos[0].z + lay.entry.z }
  await core(page, (c, e) => { const p = c.player; p.pos.set(e.x, e.y, e.z); p.vel.set(0, 0, 0); p.frozen = false }, e0)
  await sleep(1200)

  const hk = await hooks(page)
  console.log(`  hooks: v5=${hk.v5} solve=[${hk.solve.join(' ')}] player=[${hk.player.join(' ')}] world=${JSON.stringify(await v5world(page))}`)
  const fpsEst = await fps(page)
  console.log(`  fps≈${fpsEst}`)
  const drv = vp.isMobile ? touchDriver(page, vp) : keyDriver(page)

  const ids = ONLY || ORDER
  let walkedFromPrev = true // did we arrive at this island by walking?
  for (let n = 0; n < ids.length; n++) {
    const id = ids[n]
    const i = ORDER.indexOf(id)
    const i0 = Date.now()
    tag = `${size}-${id}`
    const fails = []
    const C = lay.pos[i]
    const entryW = { x: C.x + lay.entry.x, y: C.y + lay.entry.y, z: C.z + lay.entry.z }
    const exitW = { x: C.x + lay.exit.x, y: C.y + lay.exit.y, z: C.z + lay.exit.z }

    // -- ensure we're on this island (recover by teleporting to its ENTRY if a
    //    previous island's crossing failed; the walk itself is still measured)
    let pos = await v5pos(page)
    if (pos.island !== id || d2(pos, C) > lay.R + 2.5) {
      // Prefer WORLD's goto hook; verify it landed us; else write player.pos directly.
      await page.evaluate((lid) => { try { window.__journey?.v5?.goto?.(lid) } catch {} }, id).catch(() => {})
      await sleep(300)
      const p2 = await v5pos(page)
      if (p2.island !== id || d2(p2, C) > lay.R + 2.5) {
        await core(page, (c, e) => { const p = c.player; p.pos.set(e.x, e.y + 0.4, e.z); p.vel.set(0, 0, 0); p.frozen = false }, entryW)
      }
      walkedFromPrev = false
      pos = await v5pos(page)
    }
    if (pos.island !== id && d2(pos, C) > lay.R) fails.push(`spawn pos.island=${pos.island} not ${id} (WORLD: player.island update)`)

    // -- walk from ENTRY toward the obstacle (path runs entry -> exit, obstacle
    //    sits on it): head for island centre then the exit until progress stops.
    const w1 = await walkTo(page, drv, { x: C.x, z: C.z }, { timeout: 15000, arrive: 1.1 })
    if (w1.frozen) fails.push('player.frozen while walking to obstacle (a modal is open?)')
    const w2 = await walkTo(page, drv, { x: exitW.x, z: exitW.z }, { timeout: 12000, arrive: 1.2 })

    // -- solve: prefer the island's real-interaction solver
    const hkNow = await hooks(page)
    let solvedHow = null
    if (hkNow.solve.includes(id)) {
      await page.evaluate((lid) => { try { return window.__journey.solve[lid]() } catch (e) { return 'threw: ' + e.message } }, id).catch((e) => fails.push('solve threw ' + e.message))
      solvedHow = 'solve()'
      for (let t = 0; t < 30 && !(await v5state(page)).done.includes(id); t++) await sleep(500)
    } else {
      // fallback: walk to each enabled interactable on this island and use it for real
      const seen = new Set()
      for (let round = 0; round < 3 && !solvedHow; round++) {
        const its = (await v5interactables(page, C)).filter((x) => x.enabled !== false)
        let acted = false
        for (const it of its) {
          if ((await v5state(page)).done.includes(id)) break
          const w = await walkTo(page, drv, { x: it.x, z: it.z }, { timeout: 8000, arrive: Math.max(0.6, it.radius * 0.6) })
          if (w.frozen) { fails.push(`frozen at interactable ${it.id}`); break }
          await pressUse(page, drv, it)
          seen.add(it.id); acted = true
          await sleep(900)
          if ((await v5state(page)).done.includes(id)) break
        }
        if ((await v5state(page)).done.includes(id)) { solvedHow = 'interact' }
        if (!acted) break
      }
      if (!solvedHow && hkNow.solve.length === 0) fails.push('no __journey.solve hooks at all (ISL-* not landed)')
      else if (!hkNow.solve.includes(id)) fails.push(`no __journey.solve.${id} and manual interact failed`)
    }
    let st = await v5state(page)
    if (!st.done.includes(id)) {
      // give passive obstacles a last beat (e.g. proximity triggers)
      await sleep(1500); st = await v5state(page)
    }
    if (!st.done.includes(id)) {
      fails.push('useV5.done missing ' + id)
      // force-complete so the bridge/crossing can still be exercised downstream
      await core(page, (c, lid) => { try { c.useV5.getState().complete(lid) } catch {} }, id)
      await sleep(900)
      st = await v5state(page)
      if (!st.done.includes(id)) fails.push('even forced complete() did not stick')
    }
    const grant = GRANTS[id]
    if (grant && !st.abilities.includes(grant)) fails.push(`ability '${grant}' not granted by complete()`)

    await shot(page, `${size}-${pad(i + 1)}-${id}.png`)

    // -- walk across the bridge to the next island
    let cross = null
    if (i + 1 < ORDER.length && (!ONLY || ids.includes(ORDER[i + 1]))) {
      const N = lay.pos[i + 1]
      const entryN = { x: N.x + lay.entry.x, z: N.z + lay.entry.z }
      const mid = { x: (exitW.x + entryN.x) / 2, z: (exitW.z + entryN.z) / 2 }
      const c1 = await walkTo(page, drv, { x: mid.x, z: mid.z }, { timeout: 16000, arrive: 1.4 })
      const c2 = c1.ok || c1.blocked || !c1.frozen ? await walkTo(page, drv, entryN, { timeout: 20000, arrive: 1.6 }) : c1
      const p3 = await v5pos(page)
      const arrived = p3.island === ORDER[i + 1] || d2(p3, N) < lay.R
      cross = { ok: arrived, frozen: !!(c1.frozen || c2.frozen), to: ORDER[i + 1] }
      if (!arrived) fails.push(`bridge walk to ${ORDER[i + 1]} failed (${c1.ok ? '' : 'leg1:' + (c1.blocked ? 'blocked' : c1.timeout ? 'timeout' : c1.frozen ? 'frozen' : '?')}; ${c2.ok ? '' : 'leg2:' + (c2.blocked ? 'blocked' : c2.timeout ? 'timeout' : c2.frozen ? 'frozen' : '?')})`)
    }
    if (i + 1 === ORDER.length) { await sleep(2500); await shot(page, `${size}-${pad(i + 1)}-${id}-finale.png`) }

    const cerr = errorsFor(tag)
    const ok = fails.length === 0
    rec({ size, i, id, ok, ms: Date.now() - i0, detail: fails.join(' | ') || undefined, solvedHow, walkedFromPrev, console: cerr })
    if (cerr.length) console.log(`      console: ${cerr.slice(0, 3).join(' ;; ')}`)
  }
  await page.close()
}

await browser.close()
clearInterval(beat)
unlock()

// ---- report -----------------------------------------------------------------
const outFile = path.join(outdir, 'last-run.json')
writeFileSync(outFile, JSON.stringify({ ts: new Date().toISOString(), base, results }, null, 2))
console.log('\n==== V5 QA summary ====')
for (const id of (ORDER || [])) {
  const d = results.find((r) => r.size === '1440' && r.id === id)
  const m = results.find((r) => r.size === '390' && r.id === id)
  const f = (r) => (r ? (r.ok ? 'PASS' : 'FAIL ' + (r.detail || '').slice(0, 60)) : '-')
  console.log(`${id}  ${f(d).padEnd(64)}  ${f(m)}`)
}
const fails = results.filter((r) => !r.ok)
console.log(`\nfailures: ${fails.length} | results: ${outFile}`)
process.exit(fails.length ? 1 : 0)
