/**
 * QA script for L06 Remote (3D version)
 * Taps three task buttons on the phone standing near the traveller
 */

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export default async function play(page) {
  // Wait for game to be ready
  await wait(800)

  // Use find() to locate named task buttons on the phone
  const button1 = await page.evaluate(() => window.__journey.find('leaf'))
  const button2 = await page.evaluate(() => window.__journey.find('gear'))
  const button3 = await page.evaluate(() => window.__journey.find('check'))

  if (!button1 || !button2 || !button3) {
    throw new Error('Could not find task buttons')
  }

  // Tap first button (leaf)
  await page.mouse.click(button1.x, button1.y)
  await wait(1200) // Wait for orb to travel and laptop to work

  // Tap second button (gear)
  await page.mouse.click(button2.x, button2.y)
  await wait(1200)

  // Tap third button (check)
  await page.mouse.click(button3.x, button3.y)
  await wait(1200) // Wait for win

}
