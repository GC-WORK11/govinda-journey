// node scripts/v5/play.mjs [baseUrl] [--lite] [--only=L01,L02] [--size=1440|390]
// V5 end-to-end walkthrough QA (see docs/briefs5/QA.md):
//   opens /?qa (V5), clears localStorage key govinda-journey-v5, then for each island in
//   V5_ORDER: walks with real key presses (desktop) or the virtual joystick (mobile) from
//   ENTRY toward the obstacle, calls window.__journey.solve[ID]() when present, falls back
//   to pressing E on real interactables, asserts useV5.done includes ID and the GRANTS
//   ability was granted, walks across the bridge to the next island, and screenshots
//   proofs/v5/<size>-<n>-<ID>.png. FAIL lines are printed and the run keeps going.
// Shares the single box Chrome: profile /tmp/gj-chrome-profile + /tmp/gj-chrome.lock dir lock.
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { withChrome } from '../chrome.mjs'

// ---- args ------------------------------------------------------------------
const argv = process.argv.slice(2)
const base = (argv.find((a) => !a.startsWith('--')) || 'http://localhost:5190/').replace(/\/?$/, '/')
const flag = (n) => argv.includes('--' + n)
const opt = (n) => (argv.find((a) => a.startsWith('--' + n + '=')) || '').split('=')[1]
const LITE = flag('lite') ? '&lite' : ''
const VISITOR = flag('visitor') // fresh context, plain URL, no ?qa, no __journey — real input only
const ONLY = opt('only') ? opt('only').split(',') : null
const SIZE = opt('size') || 'both'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..', '..')
const outdir = path.join(root, 'proofs', 'v5')
mkdirSync(outdir, { recursive: true })

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
const fps = (page) => Promise.race([
  page.evaluate(() => new Promise((r) => {
    let n = 0; const t0 = performance.now()
    const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(Math.round(n / 3)) }
    requestAnimationFrame(f)
  })),
  sleep(12000).then(() => 0),
])

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
async function walkTo(page, drv, target, { timeout = 14000, arrive = 0.9, hop = true, burst } = {}) {
  const t0 = Date.now()
  let lastD = Infinity, lastImprove = Date.now(), probes = 0, held = null, stuckHops = 0
  const trail = []
  const burstMs = burst ?? (drv.kind === 'keys' ? 230 : 260)
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
        await drv.burst(dir, burstMs)
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
        return { ok: false, blocked: true, pos: best ? best.p : p, trail }
      }
      held = best.dir
      await drv.hold(held)
      lastD = d2(best.p, target); lastImprove = Date.now()
    } else {
      if (drv.nudge) await drv.nudge()
      await sleep(120)
      trail.push(await v5pos(page))
      if (trail.length > 60) trail.shift()
    }
  }
  await drv.release()
  return { ok: false, timeout: true, pos: await v5pos(page), trail }
}

// ---- misc ------------------------------------------------------------------
async function shot(page, file) { try { await page.screenshot({ path: path.join(outdir, file) }) } catch (e) { console.log('  shot failed: ' + e.message) } }
async function pressUse(page, drv, it) {
  if (drv.kind === 'keys') { await page.keyboard.press('KeyE'); await sleep(120); await page.keyboard.press('Enter') }
  else if (!(await tapButton(page, it && it.label ? new RegExp(it.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null, 'right'))) await tapButton(page, null, 'right')
}

const results = []
const rec = (r) => { results.push(r); console.log(`  ${r.ok ? 'PASS' : 'FAIL'} ${r.size} ${r.id}${r.detail ? ' — ' + r.detail : ''}`) }

// ---- visitor mode -----------------------------------------------------------
// The no-?qa release path: fresh browser context, plain '/', real keyboard (or
// real touch joystick + jump button at 390). No __journey, no module imports —
// progress read from the persisted store + the DOM header only.
async function visitorRun(browser, { size, vp, wire, errorsFor }) {
  const t0 = Date.now(), tag = 'visitor'
  const ctx = await browser.createBrowserContext()
  try {
    const page = await ctx.newPage()
    await page.setViewport(vp); page.setDefaultTimeout(120000); wire(page)
    const fails = []
    const drv = vp.isMobile ? touchDriver(page, vp) : keyDriver(page)
    const fwd = vp.isMobile ? [0, -1] : 'KeyW'
    const doneHas = (id) => page.evaluate((lid) => {
      try { return !!JSON.parse(localStorage.getItem('govinda-journey-v5') || '{}').state?.done?.includes(lid) } catch { return false }
    }, id).catch(() => false)
    const prog = () => page.evaluate(() => document.querySelector('.v5-prog')?.textContent || '').catch(() => '')

    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch((e) => fails.push('goto: ' + e.message))
    try { await page.bringToFront() } catch {}
    const booted = await page.waitForSelector('canvas', { timeout: 60000 }).then(() => true, () => false)
    for (let t = 0; t < 60 && !(await prog()).includes('01'); t++) await sleep(750)
    if (!booted) fails.push('no <canvas> — 3D never mounted on the visitor path')
    if (!(await prog()).includes('01')) fails.push(`header never showed 01 (spawn landed wrong?) prog='${await prog()}'`)
    await sleep(1500)

    // the how-to veil (plain-/?visitor path only) freezes the player and eats the
    // FIRST pointerdown; on touch that finger can never register as a stick, so
    // tap once, lift, wait out the fade — exactly what the veil asks a visitor to do
    if (await page.$('.v5-how').catch(() => null)) {
      if (drv.kind === 'keys') await page.keyboard.press('KeyW')
      else { await drv.burst(fwd, 150); await drv.release() }
      await sleep(1200)
    }

    // the level's own hint pill is the live tell: 'walk' → 'Jump over the low wall'
    // → 'Sit at the laptop under the tree' → gone. Drive each phase off it, the
    // way a visitor reads it.
    const hintTxt = () => page.evaluate(() =>
      (document.querySelector('.gjv5-isla-hint')?.textContent || '').toLowerCase()).catch(() => '')
    const promptOn = () => page.evaluate(() => {
      const e = document.querySelector('[data-qa="v5-prompt"],[data-qa="v5-use"]')
      if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4
    }).catch(() => false)
    const tapEl = async (sel) => {
      const pt = await page.evaluate((s) => {
        const e = document.querySelector(s); if (!e) return null
        const r = e.getBoundingClientRect(); if (r.width < 4) return null
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
      }, sel).catch(() => null)
      if (!pt) return false
      return page.touchscreen.tap(pt.x, pt.y).then(() => true).catch(() => page.mouse.click(pt.x, pt.y).then(() => true).catch(() => false))
    }
    const pressUseNow = async () => {
      if (drv.kind === 'keys') { await page.keyboard.press('KeyE'); await sleep(140); await page.keyboard.press('Enter') }
      else if (!(await tapEl('[data-qa="v5-use"]'))) await tapButton(page, /use|sit/i, 'right')
      await sleep(2200)
    }
    const E = vp.isMobile ? [0.85, -0.45] : 'KeyD', W = vp.isMobile ? [-0.85, -0.45] : 'KeyA'
    const ED = vp.isMobile ? [0.35, -0.85] : 'KeyD', WD = vp.isMobile ? [-0.35, -0.85] : 'KeyA'

    // phase 1a — walk to the low wall (z 4.2→0.55) and hop it; hint flips to
    // 'Sit at the laptop' once `crossed` fires. Hops keep the stick held forward —
    // apex 0.9m over a 0.56m wall.
    let crossed = false
    for (let t = 0; t < 46 && !crossed; t++) {
      await drv.burst(fwd, 560)
      await drv.jump()
      const h = await hintTxt()
      if (h.includes('laptop') || !h) { if (await doneHas('L01') || h.includes('laptop')) crossed = true }
      if (t % 4 === 3) crossed = crossed || (await doneHas('L01'))
    }
    await shot(page, `visitor-${size}-p1.png`)

    // phase 1b — desk at local (2.35,-0.6), ~2.5m east + ~0.6m past the wall:
    // short east legs first, then widening ping-pong — staying lateral (no
    // constant north drift) and stopping dead when the use prompt shows so the
    // press lands inside the 1.7m radius instead of sprinting through it.
    const seq = [E,E, fwd, E,E, E,E, W,W,W, fwd, E,E,E,E, W,W,W,W, fwd, E,E,E,E, W,W,W,W, fwd, E,E,E]
    let cleared = false
    for (let t = 0; t < seq.length && !cleared; t++) {
      await drv.burst(seq[t], 340)
      if (await promptOn()) { await drv.release(); await pressUseNow() }
      if (t % 2 === 1) cleared = await doneHas('L01')
      if (!cleared && t % 8 === 7 && !(await hintTxt()).includes('laptop')) break // hint gone → done or lost
    }
    await shot(page, `visitor-${size}-p2.png`)
    cleared = cleared || (await doneHas('L01'))
    if (!cleared) fails.push("done.L01 never persisted — wall hop + laptop sit not completed by real input")

    // phase 2 — drift back to centre while advancing, then forward through the
    // gate (width 2) + over the bridge until the header flips to 02
    for (let r = 0; r < 6; r++) await drv.burst(WD, 420)
    let arrived = false
    for (let t = 0; t < 80 && !arrived; t++) {
      await drv.burst(fwd, 620)
      if (t % 5 === 4) await drv.jump()
      if (t % 2 === 1 && (await prog()).includes('02')) { arrived = true; break }
    }
    if (!arrived) fails.push(`header never showed 02 — didn't land on L02 (prog='${await prog()}')`)
    await drv.release()
    await shot(page, `visitor-${size}-L01-to-L02.png`)
    const cerr = (errorsFor?.(tag) || [])
    rec({ size, i: 0, id: 'VISITOR-L01toL02', ok: fails.length === 0, ms: Date.now() - t0, fps: await fps(page).catch(() => 0), detail: fails.join(' | ') || undefined, console: cerr })
  } catch (e) {
    rec({ size, id: 'VISITOR-BOOT', ok: false, detail: 'visitor boot: ' + e.message.slice(0, 180) })
  } finally { await ctx.close().catch(() => {}) }
}

// ---------------------------------------------------------------------------
const VIEWPORTS = [
  ['1440', { width: 1440, height: 900 }],
  ['390', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
].filter(([n]) => SIZE === 'both' || n === SIZE)

let ORDER = null, GRANTS = null
console.log('[play] waiting for chrome lock')
await withChrome(async (browser) => {
console.log('[play] lock acquired')
for (const [size, vp] of VIEWPORTS) {
  const errors = []
  let tag = 'boot'
  const wire = (page) => {
    page.on('console', (m) => { if (m.type() === 'error' && !NOISE.test(m.text())) errors.push({ tag, text: m.text().slice(0, 300) }) })
    page.on('pageerror', (e) => errors.push({ tag, text: 'pageerror: ' + e.message.slice(0, 300) }))
    page.on('error', (e) => errors.push({ tag, text: 'page crash: ' + e.message.slice(0, 300) }))
  }
  const errorsFor = (t) => errors.filter((e) => e.tag === t).map((e) => e.text)
  if (VISITOR) { tag = 'visitor'; await visitorRun(browser, { size, vp, wire, errorsFor }); continue }
  const isReady = (page) => page.evaluate(async (src) => {
    try { const c = await import(src); if (c.walkables.size > 0) return true } catch {}
    return !!(window.__journey && window.__journey.v5)
  }, CORE).catch(() => false)
  const waitReady = async (page) => {
    for (let t = 0; t < 40; t++) { if (await isReady(page)) return true; await sleep(750) }
    return false
  }

  let page = await browser.newPage()
  await page.setViewport(vp)
  page.setDefaultTimeout(120000)
  wire(page)
  // V4 side-by-side comparison page — created lazily so the V5 page never sits
  // backgrounded while the world boots (background tabs get rAF ≈ 0 → sim freezes).
  let v4 = null
  const v4shot = async (id, n) => {
    try {
      if (!v4) { v4 = await browser.newPage(); await v4.setViewport(vp); v4.setDefaultTimeout(120000) }
      await v4.goto(`${base}?v4&qa&at=${id}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await sleep(4600)
      await v4.screenshot({ path: path.join(outdir, `v4-${size}-${pad(n)}-${id}.png`) })
    } catch (e) { console.log(`  v4 shot ${id} failed: ${e.message.slice(0, 120)}`) }
    try { await page.bringToFront() } catch {}
  }

  console.log(`\n=== v5 ${size} ${vp.width}x${vp.height} ===`)
  // fresh state: clear the persisted v5 store, reload so zustand rehydrates empty
  await page.goto(base, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.evaluate(() => localStorage.removeItem('govinda-journey-v5')).catch(() => {})
  await page.goto(`${base}?qa${LITE}`, { waitUntil: 'networkidle2' })

  // wait until the V5 world is live: walkables registered or WORLD's ?qa hook up
  let ready = await waitReady(page)
  if (!ready) {
    // maybe routing is still behind ?v5
    await page.goto(`${base}?v5&qa${LITE}`, { waitUntil: 'networkidle2' }).catch(() => {})
    ready = await waitReady(page)
  }
  if (!ready) {
    rec({ size, id: 'BOOT', ok: false, detail: 'V5 world not mounted (no core.walkables, no __journey.v5) — is ?qa routed to V5?' })
    await shot(page, `${size}-00-nov5.png`)
    await v4?.close().catch(() => {})
    await page.close().catch(() => {})
    continue
  }
  // __journey.v5 attaches before the scene fills; don't start until islands exist
  for (let t = 0; t < 40; t++) { const w = await v5world(page).catch(() => null); if (w && w.walkables > 0) break; await sleep(750) }
  try {
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
  const hasCanvas = await page.evaluate(() => !!document.querySelector('canvas')).catch(() => false)
  console.log(`  hooks: v5=${hk.v5} solve=[${hk.solve.join(' ')}] player=[${hk.player.join(' ')}] world=${JSON.stringify(await v5world(page))} canvas=${hasCanvas}`)
  if (!hasCanvas) rec({ size, id: 'BOOT', ok: false, detail: 'no <canvas> on page — 3D never mounted (integrator-reported mobile blank-3D)' })
  const fpsEst = await fps(page)
  console.log(`  fps≈${fpsEst}`)
  let drv = vp.isMobile ? touchDriver(page, vp) : keyDriver(page)

  const ids = ONLY || ORDER
  let walkedFromPrev = true // did we arrive at this island by walking?
  for (let n = 0; n < ids.length; n++) {
    const id = ids[n]
    const i = ORDER.indexOf(id)
    const i0 = Date.now()
    tag = `${size}-${id}`
    const fails = []
    try { await page.bringToFront() } catch {}
    const C = lay.pos[i]
    const entryW = { x: C.x + lay.entry.x, y: C.y + lay.entry.y, z: C.z + lay.entry.z }
    const exitW = { x: C.x + lay.exit.x, y: C.y + lay.exit.y, z: C.z + lay.exit.z }
    let cross = null, solvedHow = null

    try {
    // -- ensure we're on this island (recover by teleporting to its ENTRY if a
    //    previous island's crossing failed; the walk itself is still measured)
    let pos = await v5pos(page)
    if (pos.island !== id || d2(pos, C) > lay.R + 2.5) {
      // __journey.v5.goto(id) → __journey.player.teleport(x,y,z) → player.pos write.
      await page.evaluate((lid) => { try { window.__journey?.v5?.goto?.(lid) } catch {} }, id).catch(() => {})
      await sleep(350)
      let p2 = await v5pos(page)
      if (p2.island !== id || d2(p2, C) > lay.R + 2.5) {
        await page.evaluate((e) => { try { window.__journey?.player?.teleport?.(e.x, e.y, e.z) } catch {} }, entryW).catch(() => {})
        await sleep(350)
        p2 = await v5pos(page)
      }
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
    if (hkNow.solve.includes(id)) {
      for (let attempt = 0; attempt < 2; attempt++) {
        await page.evaluate((lid) => { try { return window.__journey.solve[lid]() } catch (e) { return 'threw: ' + e.message } }, id).catch((e) => fails.push('solve threw ' + e.message))
        solvedHow = 'solve()'
        for (let t = 0; t < 36 && !(await v5state(page)).done.includes(id); t++) await sleep(500)
        if ((await v5state(page)).done.includes(id)) break
      }
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
    await v4shot(id, i + 1)

    // -- walk across the bridge to the next island (always test it when this island
    //    is in scope — with --only=I01 the crossing IS the thing being retested)
    if (i + 1 < ORDER.length) {
      const N = lay.pos[i + 1]
      const entryN = { x: N.x + lay.entry.x, z: N.z + lay.entry.z }
      const mid = { x: (exitW.x + entryN.x) / 2, z: (exitW.z + entryN.z) / 2 }
      const trace = []
      const sampler = setInterval(async () => { try { const p = await v5pos(page); trace.push([Math.round((Date.now() - i0) / 100) / 10, +p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2), p.grounded ? 1 : 0]) } catch {} }, 150)
      let c0, c1, c2, p3
      try {
        // leg0: enter through the deck mouth — steering straight at mid can cut the
        // corner and step off the rim beside the strip (I01 desktop fail, run 11).
        // Loose 1.4 m arrival: tighter targets drag the bot along the rim at low fps.
        c0 = await walkTo(page, drv, { x: exitW.x, z: exitW.z }, { timeout: 9000, arrive: 1.4, burst: 150 })
        c1 = c0.frozen ? c0 : await walkTo(page, drv, { x: mid.x, z: mid.z }, { timeout: 16000, arrive: 1.4, burst: 150 })
        c2 = c1.ok || c1.blocked || !c1.frozen ? await walkTo(page, drv, entryN, { timeout: 20000, arrive: 1.6, burst: 150 }) : c1
        p3 = await v5pos(page)
      } finally { clearInterval(sampler) }
      const arrived = p3.island === ORDER[i + 1] || d2(p3, N) < lay.R
      cross = { ok: arrived, frozen: !!(c1.frozen || c2.frozen), to: ORDER[i + 1] }
      if (!arrived) {
        const leg = (c) => (c.ok ? 'ok' : c.blocked ? 'blocked' : c.timeout ? 'timeout' : c.frozen ? 'frozen' : '?')
        fails.push(`bridge walk to ${ORDER[i + 1]} failed (leg1:${leg(c1)}; leg2:${leg(c2)}; end y=${p3.y.toFixed(1)} vs isle ${N.y.toFixed(1)})`)
        console.log(`      cross-trace ${id}->${ORDER[i + 1]} (t,x,y,z,g): ` + trace.filter((_, k) => k % 4 === 0).map((p) => p.join(',')).join('  '))
        await shot(page, `${size}-${pad(i + 1)}-${id}-stuck.png`)
      }
    }
    if (i + 1 === ORDER.length) { await sleep(2500); await shot(page, `${size}-${pad(i + 1)}-${id}-finale.png`) }
    } catch (e) {
      fails.push('harness: ' + e.message)
    }

    // if the page's execution context died mid-island (renderer crash / reload),
    // rebuild it — persisted progress survives, so the run can keep going.
    if (!(await page.evaluate(() => 1).then(() => true, () => false))) {
      fails.push('page context died during island (renderer crash or navigation)')
      try { await page.close() } catch {}
      page = await browser.newPage()
      await page.setViewport(vp); page.setDefaultTimeout(120000); wire(page)
      await page.goto(`${base}?qa${LITE}`, { waitUntil: 'networkidle2' }).catch(() => {})
      if (await waitReady(page)) await sleep(1200); else fails.push('rebuilt page never became ready')
      drv = vp.isMobile ? touchDriver(page, vp) : keyDriver(page)
    }

    const cerr = errorsFor(tag)
    const islandFps = await fps(page).catch(() => 0)
    const ok = fails.length === 0
    rec({ size, i, id, ok, ms: Date.now() - i0, fps: islandFps, detail: fails.join(' | ') || undefined, solvedHow, walkedFromPrev, console: cerr })
    console.log(`      [fps≈${islandFps}]`)
    if (cerr.length) console.log(`      console: ${cerr.slice(0, 3).join(' ;; ')}`)
  }
  const bootErr = errors.filter((e) => !ORDER.some((id) => e.tag.endsWith(id))).map((e) => e.text)
  if (bootErr.length) console.log(`  boot/console errors: ${[...new Set(bootErr)].slice(0, 5).join(' ;; ')}`)
  await v4?.close().catch(() => {})
  await page.close().catch(() => {})
  } catch (e) {
    rec({ size, id: 'BOOT', ok: false, detail: 'boot harness: ' + e.message.slice(0, 160) })
    try { await v4?.close() } catch {}
    try { await page.close() } catch {}
  }
}
}) // withChrome

// ---- report -----------------------------------------------------------------
const outFile = path.join(outdir, 'last-run.json')
writeFileSync(outFile, JSON.stringify({ ts: new Date().toISOString(), base, results }, null, 2))
console.log('\n==== V5 QA summary ====')
for (const id of (ORDER || [])) {
  const d = results.find((r) => r.size === '1440' && r.id === id)
  const m = results.find((r) => r.size === '390' && r.id === id)
  const f = (r) => (r ? `${r.ok ? 'PASS' : 'FAIL ' + (r.detail || '').slice(0, 54)} [fps≈${r.fps ?? '?'}]` : '-')
  console.log(`${id}  ${f(d).padEnd(64)}  ${f(m)}`)
}
const fails = results.filter((r) => !r.ok)
console.log(`\nfailures: ${fails.length} | results: ${outFile}`)
process.exit(fails.length ? 1 : 0)
