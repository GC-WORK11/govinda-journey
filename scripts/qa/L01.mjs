// Placeholder QA: hold the button. Replace when the real game lands.
export default async function play(page) {
  const b = await page.waitForSelector('.game-body .btn')
  const box = await b.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down()
  await new Promise((r) => setTimeout(r, 2200)); await page.mouse.up()
}
