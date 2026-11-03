/**
 * Shared mutable input state for the V5 player. Keyboard lives here; the DOM overlay
 * (Controls.tsx) writes joystick / camera-drag / button state into the same object.
 * No React state — consumed once per frame by Player.tsx.
 */
export const input = {
  /** Held key codes (KeyboardEvent.code): KeyW, ArrowUp, Space, ShiftLeft, … */
  keys: new Set<string>(),
  /** Synthetic holds for ?qa press(key, ms): code → performance.now() deadline. */
  synth: new Map<string, number>(),
  /** Virtual joystick vector: x right, y forward (so pushing up = -1 → we store forward as -y). Range -1..1. */
  joy: { x: 0, y: 0, active: false },
  /** Accumulated camera orbit drag deltas (pixels), consumed each frame. */
  camDX: 0,
  camDY: 0,
  /** Accumulated zoom delta (wheel px / pinch px), consumed each frame. Positive = zoom out. */
  zoom: 0,
  /** performance.now() of the last jump press (jump buffer). */
  jumpAt: -1e9,
  /** performance.now() of the last use press (E / Enter / use button). */
  useAt: -1e9,
  /** True after the first touch-pointer is seen → Controls shows the mobile UI. */
  touch: false,
  /** The WebGL canvas (set by Player). Pointer hits elsewhere are ignored for orbit. */
  canvasEl: null as HTMLCanvasElement | null,
}

export const now = () => performance.now()

/** Minimum effective hold for a real key press (ms). At ~5 fps a 150-260ms QA
 * burst — or a quick human tap — can land entirely inside one rAF gap: keydown
 * and keyup both fire before the next frame reads input.keys and the press is
 * invisible. Latch every press until downAt+MIN_HOLD so ~3 fps still sees it. */
export const MIN_HOLD = 300
const downAt = new Map<string, number>()

export function isDown(...codes: string[]) {
  const t = now()
  for (const c of codes) if (input.keys.has(c) || (input.synth.get(c) ?? 0) > t) return true
  return false
}

/** Movement keys we never want to scroll the page. */
const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
])

let installed = false
/** Attach global key listeners once (Player mounts this). */
export function installInput() {
  if (installed) return () => {}
  installed = true
  const down = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement | null)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable) return
    if (GAME_KEYS.has(e.code)) e.preventDefault()
    if (!e.repeat) {
      downAt.set(e.code, now())
      // future-dated buffers: the 120/160ms consume windows can't expire inside
      // a frame gap before the press is seen (same trick as qa press()).
      if (e.code === 'Space') input.jumpAt = now() + MIN_HOLD
      if (e.code === 'KeyE' || e.code === 'Enter') input.useAt = now() + MIN_HOLD
    }
    input.keys.add(e.code)
    input.touch = false // real keyboard → desktop UI
  }
  const up = (e: KeyboardEvent) => {
    input.keys.delete(e.code)
    const until = (downAt.get(e.code) ?? 0) + MIN_HOLD
    if (until > now()) input.synth.set(e.code, until)
  }
  const blur = () => { input.keys.clear(); input.synth.clear(); downAt.clear() }
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  window.addEventListener('blur', blur)
  return () => {
    installed = false
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
    window.removeEventListener('blur', blur)
  }
}

/** ?qa hook: hold a key for ms. Accepts friendly names or KeyboardEvent.code. */
const KEY_ALIAS: Record<string, string> = {
  w: 'KeyW', a: 'KeyA', s: 'KeyS', d: 'KeyD',
  up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
  space: 'Space', shift: 'ShiftLeft', e: 'KeyE', enter: 'Enter',
}
export function pressKey(key: string, ms = 300) {
  const code = KEY_ALIAS[key.toLowerCase()] ?? key
  const deadline = now() + ms
  input.synth.set(code, deadline)
  // A synthetic press stays "pressed" for ms — let the jump/use buffers cover
  // the whole hold so slow frames can't let them expire before being seen.
  if (code === 'Space') input.jumpAt = deadline
  if (code === 'KeyE' || code === 'Enter') input.useAt = deadline
}
