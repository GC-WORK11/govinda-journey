// V6 perf, capped: ONE island at 1440x900 plus one cold visit. Run under a hard cap:
//   nice -n 19 timeout -k 5 120 node scripts/v6/metrics.mjs [out.json] [island]     (island defaults to L01)
// Target: built dist on vite preview, http://localhost:5191. Every page load is a fresh browser context, NO ?qa.
// Page hooks are measurement-only, app code is untouched: three's __THREE_DEVTOOLS__ 'observe' event hands over the
// WebGLRenderer, whose render() is wrapped to read renderer.info per call; requestAnimationFrame is wrapped to time JS per frame.
// The island pass pins performance.now to a 60 fps virtual clock so drei's PerformanceMonitor never declines
// (below 40 fps it drops shadows, FX, water and DPR). Draw calls and triangles do not depend on the clock.
// The JSON is rewritten after every step, so a run cut off by the timeout keeps the steps that finished.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { gzipSync } from 'node:zlib'
import { cpus } from 'node:os'
import { withChrome, DESKTOP } from '../chrome.mjs'

const ROOT = '/workspace/govinda-journey', DIST = `${ROOT}/dist`, BASE = 'http://localhost:5191'
const [OUT = '/tmp/gj-perf-cap.json', ISLAND = 'L01'] = process.argv.slice(2)
if (!/^[LI]\d{2}$/.test(ISLAND)) throw new Error(`bad island id: ${ISLAND}`)
const started = Date.now()
const ist = (t = Date.now()) => new Date(t + 330 * 60000).toISOString().slice(0, 16).replace('T', ' ') + ' IST'
const r0 = (x) => (x == null ? null : Math.round(x))
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10)
const quant = (a, p) => {
  const s = a.filter((x) => x != null).sort((x, y) => x - y)
  if (!s.length) return null
  const i = (s.length - 1) * p, lo = Math.floor(i)
  return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo)
}
const base = (u) => u.split('/').pop()
const jsNames = readdirSync(`${DIST}/assets`).filter((f) => f.endsWith('.js')).sort()
const fileInfo = Object.fromEntries(jsNames.map((f) => { const buf = readFileSync(`${DIST}/assets/${f}`); return [f, { raw: buf.length, gz: gzipSync(buf, { level: 9 }).length }] }))
const distId = createHash('sha1').update(readFileSync(`${DIST}/index.html`)).update(jsNames.join()).digest('hex').slice(0, 10)
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8' }).trim()
const out = {
  at: ist(started), head: git('rev-parse', '--short', 'HEAD'), dirty: git('status', '--porcelain').split('\n').filter(Boolean).length,
  distId, distBuilt: ist(statSync(`${DIST}/index.html`).mtimeMs), cpu: `${cpus().length} vCPU, ${cpus()[0].model.trim()}`,
  island: ISLAND, bundle: jsNames.map((f) => ({ f, ...fileInfo[f], initial: false })), cold: null, level: null, err: null,
}
const save = () => writeFileSync(OUT, JSON.stringify({ ...out, finished: ist() }, null, 1))
save()

function hook({ full, vsync }) {
  const real = performance.now.bind(performance)
  let vt = real()
  const P = (window.__gjPerf = { now: real, r: null, frames: [], cur: null, dpr0: Math.min(1.5, devicePixelRatio || 1), firstDrawAt: null, playerAt: null, ladderAt: null })
  if (full) performance.now = () => vt
  const newFrame = (t) => {
    if (full) vt += vsync
    const f = { t, js: 0, calls: 0, tris: 0, passes: 0, rms: 0, shadow: 0, dpr: 0 }
    P.frames.push(f)
    return f
  }
  const raf = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = (cb) => raf((t) => {
    const f = P.cur && P.cur.t === t ? P.cur : (P.cur = newFrame(t))
    const s = real()
    cb(t)
    f.js += real() - s
  })
  window.__THREE_DEVTOOLS__ = new EventTarget()
  window.__THREE_DEVTOOLS__.addEventListener('observe', (e) => {
    const r = e.detail
    if (P.r || !r || !r.isWebGLRenderer) return
    P.r = r
    const render = r.render
    r.render = function (scene, camera) {
      const f = P.cur || (P.cur = newFrame(real()))
      if (!f.passes) { f.shadow = r.shadowMap.enabled ? 1 : 0; f.dpr = r.getPixelRatio() }
      const info = r.info, c0 = info.render.calls, t0 = info.render.triangles, s = real()
      const out = render.call(r, scene, camera)
      f.rms += real() - s
      f.passes++
      f.calls += info.render.calls - (info.autoReset ? 0 : c0)
      f.tris += info.render.triangles - (info.autoReset ? 0 : t0)
      if (P.firstDrawAt == null && info.render.calls > 0) P.firstDrawAt = real()
      if (P.playerAt == null && (scene.getObjectByName('chest') || scene.getObjectByName('spine'))?.isBone) P.playerAt = real()
      if (P.ladderAt == null && !r.shadowMap.enabled) P.ladderAt = real()
      return out
    }
  })
}

const READY = () => window.__gjPerf?.firstDrawAt != null
const PLAYER = () => window.__gjPerf?.playerAt != null
const STABLE = () => {
  const g = window.__gjPerf, fs = g.frames.filter((f) => f.passes).slice(-4)
  if (fs.length < 4 || g.now() - (g.playerAt ?? g.firstDrawAt) < 3000) return false
  const flat = (k) => { const v = fs.map((f) => f[k]), mx = Math.max(...v); return mx - Math.min(...v) <= 0.02 * mx }
  return flat('calls') && flat('tris')
}
const SNAP = () => {
  const g = window.__gjPerf, r = g.r, nav = performance.getEntriesByType('navigation')[0]
  return {
    firstDraw: g.firstDrawAt, player: g.playerAt, ladder: g.ladderAt, dpr0: g.dpr0, dpr: r ? r.getPixelRatio() : null,
    shadowOn: r ? r.shadowMap.enabled : null, geo: r ? r.info.memory.geometries : null, tex: r ? r.info.memory.textures : null,
    progs: r ? (r.info.programs?.length ?? 0) : 0, dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd,
    fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
    frames: g.frames.filter((f) => f.passes), res: performance.getEntriesByType('resource').map((e) => ({ n: e.name, end: e.responseEnd })),
  }
}

async function open(b, url, full) {
  const ctx = await b.createBrowserContext(), p = await ctx.newPage(), errors = []
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
  p.on('pageerror', (e) => errors.push('PAGEERR ' + String(e).slice(0, 160)))
  await p.setViewport(DESKTOP)
  await p.evaluateOnNewDocument(hook, { full, vsync: 1000 / 60 })
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch((e) => errors.push('GOTO ' + String(e).slice(0, 120)))
  return { ctx, p, errors }
}

async function coldRun(b) {
  const { ctx, p, errors } = await open(b, `${BASE}/`, false)
  try {
    await p.waitForFunction(READY, { timeout: 25000, polling: 500 })
    await p.waitForFunction(PLAYER, { timeout: 25000, polling: 500 }).catch(() => {})
    const s = await p.evaluate(SNAP)
    const tti = s.player == null ? null : Math.max(s.firstDraw, s.player)
    return {
      firstDraw: r0(s.firstDraw), player: r0(s.player), tti: r0(tti), dcl: r0(s.dcl), load: r0(s.load), fcp: r0(s.fcp), ladder: r0(s.ladder),
      before: tti == null ? [] : [...new Set(s.res.filter((r) => r.end <= tti && /\.(js|css)$/.test(r.n)).map((r) => base(r.n)))], errors,
    }
  } finally { await ctx.close() }
}

async function islandRun(b) {
  const { ctx, p, errors } = await open(b, `${BASE}/?at=${ISLAND}`, true)
  try {
    await p.waitForFunction(READY, { timeout: 25000, polling: 500 })
    await p.waitForFunction(PLAYER, { timeout: 25000, polling: 500 }).catch(() => {})
    const stable = await p.waitForFunction(STABLE, { timeout: 12000, polling: 500 }).then(() => true, () => false)
    await p.evaluate(() => { window.__gjPerf.frames = [] })
    await p.waitForFunction((n) => window.__gjPerf.frames.filter((f) => f.passes).length >= n, { timeout: 12000, polling: 500 }, 4).catch(() => {})
    return { ...(await p.evaluate(SNAP)), stable, errors }
  } finally { await ctx.close() }
}

const share = (fs) => (fs.length ? r1(fs.filter((f) => f.shadow).length / fs.length) : null)
const summ = (fs) => {
  const js = fs.map((f) => f.js), rms = fs.map((f) => f.rms), dt = fs.slice(1).map((f, i) => f.t - fs[i].t)
  return {
    n: fs.length, calls: r0(quant(fs.map((f) => f.calls), 0.5)), tris: r0(quant(fs.map((f) => f.tris), 0.5)), passes: r0(quant(fs.map((f) => f.passes), 0.5)),
    js: r1(quant(js, 0.5)), jsP95: r1(quant(js, 0.95)), render: r1(quant(rms, 0.5)), dt: r1(quant(dt, 0.5)), dtP95: r1(quant(dt, 0.95)), shadow: share(fs), frames: fs,
  }
}
function islandRecord(s, initial) {
  const visit = [...new Set(s.res.map((r) => base(r.n)).filter((n) => fileInfo[n]))]
  const lazy = visit.filter((n) => !initial.includes(n))
  const models = s.res.filter((r) => /\/models\//.test(r.n)).reduce((a, r) => { try { return a + statSync(DIST + new URL(r.n).pathname).size } catch { return a } }, 0)
  return {
    playerMs: r0(s.player), firstDrawMs: r0(s.firstDraw), ladderMs: r0(s.ladder), stable: s.stable, dpr0: s.dpr0, dpr: s.dpr, shadowOn: s.shadowOn,
    geo: s.geo, tex: s.tex, progs: s.progs, full: summ(s.frames),
    jsFiles: visit.length, jsGz: visit.reduce((a, n) => a + fileInfo[n].gz, 0), lazy, lazyGz: lazy.reduce((a, n) => a + fileInfo[n].gz, 0), models,
    errors: s.errors.slice(0, 5),
  }
}

await withChrome(async (b) => {
  out.version = (await b.version()).replace('/', ' ')
  out.cold = await coldRun(b).catch((e) => ({ err: String(e).slice(0, 200) }))
  const initial = out.cold.before ?? []
  out.bundle.forEach((x) => { x.initial = initial.includes(x.f) })
  save()
  console.log('cold tti', out.cold.tti ?? out.cold.err, 'initial js files', out.bundle.filter((x) => x.initial).length)
  const s = await islandRun(b).catch((e) => ({ err: String(e).slice(0, 200) }))
  out.level = s.err ? { id: ISLAND, err: s.err } : { id: ISLAND, ...islandRecord(s, initial) }
  save()
  console.log(ISLAND, out.level.err ?? `full calls ${out.level.full.calls} tris ${out.level.full.tris} js ${out.level.full.js}ms`)
}, { maxWaitMs: 60000 }).catch((e) => { out.err = String(e).slice(0, 200); save() })
console.log('wrote', OUT)
process.exit(0)
