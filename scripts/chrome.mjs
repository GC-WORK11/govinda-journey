// THE ONLY sanctioned way to start Chrome on this box (one Chrome at a time, shared profile).
//   import { withChrome } from '/workspace/govinda-journey/scripts/chrome.mjs'
//   await withChrome(async (browser) => { const p = await browser.newPage(); ... })
// Never call puppeteer.launch() yourself. Lock: /tmp/gj-chrome.lock/owner (pid + heartbeat).
import { createRequire } from 'module'
import { mkdirSync, rmSync, statSync, writeFileSync, readFileSync, utimesSync, readlinkSync } from 'fs'
const require = createRequire('/workspace/govinda-journey/scripts/x.mjs')
let puppeteer; try { puppeteer = require('puppeteer-core') } catch { puppeteer = require('/tmp/pp/node_modules/puppeteer-core') }
export const LOCK = '/tmp/gj-chrome.lock', PROFILE = '/tmp/gj-chrome-profile'
const alive = (pid) => { try { process.kill(pid, 0); return true } catch (e) { return e.code === 'EPERM' } }
function stale() {
  try {
    const pid = +readFileSync(LOCK + '/owner', 'utf8')
    if (pid && !alive(pid)) return true
    return Date.now() - statSync(LOCK).mtimeMs > 20 * 60000 // no heartbeat for 20 min
  } catch { try { return Date.now() - statSync(LOCK).mtimeMs > 120000 } catch { return false } } // legacy lock without owner
}
export async function acquire(maxWaitMs = 15 * 60000) {
  const t0 = Date.now()
  for (;;) {
    try { mkdirSync(LOCK); writeFileSync(LOCK + '/owner', String(process.pid)); break } catch {}
    if (stale()) { try { rmSync(LOCK, { recursive: true, force: true }) } catch {}; continue }
    if (Date.now() - t0 > maxWaitMs) throw new Error('chrome lock wait timeout')
    await new Promise((r) => setTimeout(r, 3000))
  }
  const beat = setInterval(() => { try { const n = new Date(); utimesSync(LOCK, n, n) } catch {} }, 30000); beat.unref()
  const release = () => { clearInterval(beat); try { if (+readFileSync(LOCK + '/owner', 'utf8') === process.pid) rmSync(LOCK, { recursive: true, force: true }) } catch {} }
  process.on('exit', release)
  // Chrome's own SingletonLock left by a dead Chrome: link target is "host-pid"
  try { const pid = +readlinkSync(PROFILE + '/SingletonLock').split('-').pop(); if (pid && !alive(pid)) for (const f of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) rmSync(PROFILE + '/' + f, { force: true }) } catch {}
  return release
}
export async function withChrome(fn, { maxWaitMs } = {}) {
  const release = await acquire(maxWaitMs)
  let b
  try {
    b = await puppeteer.launch({ userDataDir: PROFILE, executablePath: '/usr/bin/google-chrome', headless: 'new', protocolTimeout: 120000,
      args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
    return await fn(b)
  } finally { try { await b?.close() } catch {}; release() }
}
export const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
export const DESKTOP = { width: 1440, height: 900 }
