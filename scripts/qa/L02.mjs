/**
 * QA script for L02: drag each rejection letter into the water gap.
 * @param {import('puppeteer').Page} page
 */
export default async function play(page) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  
  // Wait for the game to load
  await page.waitForSelector('[data-qa="letter-0"]', { timeout: 5000 })
  await sleep(500)

  // Drag each letter to the drop zone
  for (let i = 0; i < 5; i++) {
    const selector = `[data-qa="letter-${i}"]`
    
    // Check if letter still exists (might have been placed already)
    const exists = await page.$(selector)
    if (!exists) {
      await sleep(200)
      continue
    }
    
    // Get SVG and letter positions
    const positions = await page.evaluate((sel) => {
      const svg = document.querySelector('.l02 svg')
      const letterG = document.querySelector(sel)
      if (!svg || !letterG) return null
      
      const svgRect = svg.getBoundingClientRect()
      const letterRect = letterG.getBoundingClientRect()
      
      // Drop zone is in the middle of the water gap (viewBox 0 0 380 250)
      // Water gap is roughly from y=80 to y=170, center at y=125
      // And from x=40 to x=340
      const dropX = svgRect.left + svgRect.width / 2
      const dropY = svgRect.top + (125 / 250) * svgRect.height
      
      return {
        letterX: letterRect.left + letterRect.width / 2,
        letterY: letterRect.top + letterRect.height / 2,
        dropX: dropX + (Math.random() - 0.5) * 100, // Spread them out
        dropY,
      }
    }, selector)
    
    if (!positions) {
      await sleep(200)
      continue
    }

    // Drag the letter to the drop zone
    await page.mouse.move(positions.letterX, positions.letterY, { steps: 3 })
    await sleep(50)
    await page.mouse.down()
    await sleep(50)
    await page.mouse.move(positions.dropX, positions.dropY, { steps: 12 })
    await sleep(50)
    await page.mouse.up()
    
    // Wait for fold animation to complete
    await sleep(800)
  }

  // Wait for traveler to cross and game to complete
  await sleep(3500)
}
