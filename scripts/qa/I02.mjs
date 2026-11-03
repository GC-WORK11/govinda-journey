/**
 * QA for I02 — On the road.
 * Hold anywhere -> the train drives around the oval; on the last stretch it
 * pulls into the station by itself and stops -> win.
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default async function play(page) {
  await sleep(900)
  const vp = page.viewport()
  await page.mouse.move(vp.width / 2, vp.height * 0.45)
  await sleep(150)

  // hold to drive — well over one lap (train auto-brakes into the station)
  await page.mouse.down()
  await sleep(4600)
  await page.mouse.up()

  // wait for the arrival + payoff
  await sleep(4500)
}
