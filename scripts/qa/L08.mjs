// L08 "Sign Flow": teach three hand signs, then sign the laptop's sentence.
export default async function play(page) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const tap = async (sel) => (await page.waitForSelector(sel, { visible: true })).click()

  // step 1 · teach: palm -> "hello", two fingers -> Space, fist -> Enter
  const teach = async (hand, act) => {
    await tap(`[data-qa="hand-${hand}"]`)
    await tap(`[data-qa="act-${act}"]`)
  }
  await teach('palm', 'hello')
  await teach('v', 'space')
  await teach('fist', 'enter')
  await tap('[data-qa="start-signing"]')

  // step 2 · sign: the laptop needs "hello", Space, Enter — in that order
  for (const hand of ['palm', 'v', 'fist']) {
    await tap(`[data-qa="hand-${hand}"]`)
    await sleep(1150) // let the landmark trace finish before the next sign
  }
}
