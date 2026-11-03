/**
 * QA script for L02: drag each rejection letter into the water gap.
 * @param {import('puppeteer').Page} page
 */
export default async function play(page) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  
  // Wait for the game to load
  await page.waitForSelector('[data-qa="letter-0"]', { timeout: 5000 })
  await sleep(800)

  // Get the SVG bounding box to calculate drop zone
  const svgBox = await page.$eval('.l02 svg', (el) => {
    const rect = el.getBoundingClientRect()
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    }
  })

  // Calculate drop zone center (middle of the water gap)
  const dropX = svgBox.left + svgBox.width / 2
  const dropY = svgBox.top + svgBox.height / 2

  // Drag each letter to the drop zone
  for (let i = 0; i < 5; i++) {
    const selector = `[data-qa="letter-${i}"] rect`
    
    // Check if letter still exists (might have been placed already)
    const exists = await page.$(selector)
    if (!exists) continue
    
    // Get letter position - find the rect inside the g element
    const letterBox = await page.$eval(selector, (el) => {
      const rect = el.getBoundingClientRect()
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      }
    })

    // Drag the letter to the drop zone
    await page.mouse.move(letterBox.x, letterBox.y, { steps: 5 })
    await sleep(100)
    await page.mouse.down()
    await sleep(100)
    await page.mouse.move(dropX, dropY, { steps: 15 })
    await sleep(100)
    await page.mouse.up()
    
    // Wait for fold animation
    await sleep(600)
  }

  // Wait for traveler to cross and game to complete
  await sleep(4000)
}
