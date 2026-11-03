import { withChrome, MOBILE, DESKTOP } from './chrome.mjs'
const base = process.argv[2] || 'https://govinda-journey.vercel.app/'
const ids = ['L01','L02','L03','I01','L05','L04','I02','L06','L07','L08','L09']
await withChrome(async (b) => {
  for (const [tag, vp] of [['desk', DESKTOP], ['mob', MOBILE]]) {
    const p = await b.newPage(); await p.setViewport(vp)
    const errs = []
    p.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 160)))
    p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 160)) })
    for (const id of ids) {
      errs.length = 0
      try {
        await p.goto(`${base}?qa&at=${id}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
        await new Promise(r => setTimeout(r, 6000))
        const info = await p.evaluate(() => ({ canvas: !!document.querySelector('canvas'), text: document.body.innerText.slice(0, 80).replace(/\n/g, ' | ') }))
        await p.screenshot({ path: `proofs/v4check/${tag}-${id}.png` })
        console.log(tag, id, info.canvas ? 'canvas' : 'NO-CANVAS', '::', info.text, errs.length ? '\n   ' + [...new Set(errs)].join('\n   ') : '')
      } catch (e) { console.log(tag, id, 'FAIL', e.message.slice(0, 120)) }
    }
    await p.close()
  }
})
console.log('V4CHECK DONE')
