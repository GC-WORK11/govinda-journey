/**
 * QA script for L02: drag each rejection letter into the water gap.
 * @param {import('puppeteer').Page} page
 */
export default async function play(page) {
  // Wait for the game to load
  await page.waitForSelector('[data-qa="letter-0"]', { timeout: 5000 })
  await page.waitForTimeout(500)

  // Get the SVG bounding box to calculate drop zone
  const svgBox = await page.$eval('svg', (el) => {
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
    const selector = `[data-qa="letter-${i}"]`
    
    // Wait for letter to be available
    await page.waitForSelector(selector, { timeout: 3000 })
    
    // Get letter position
    const letterBox = await page.$eval(selector, (el) => {
      const rect = el.getBoundingClientRect()
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      }
    })

    // Drag the letter to the drop zone
    await page.mouse.move(letterBox.x, letterBox.y)
    await page.mouse.down()
    await page.waitForTimeout(50)
    await page.mouse.move(dropX, dropY, { steps: 10 })
    await page.waitForTimeout(50)
    await page.mouse.up()
    
    // Wait for animation
    await page.waitForTimeout(400)
  }

  // Wait for traveler to cross and game to complete
  await page.waitForTimeout(3000)
}
