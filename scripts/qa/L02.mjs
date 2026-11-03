/**
 * QA script for L02: drag each rejection letter into the water gap.
 * @param {import('puppeteer').Page} page
 */
export default async function play(page) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  
  // Wait for the game to load
  await page.waitForSelector('[data-qa="letter-0"]', { timeout: 5000 })
  await sleep(500)

  // Drag each letter to the drop zone, one at a time
  for (let i = 0; i < 5; i++) {
    const selector = `[data-qa="letter-${i}"]`
    
    // Check if letter still exists
    const exists = await page.$(selector)
    if (!exists) {
      await sleep(300)
      continue
    }
    
    // Get SVG and letter positions
    const positions = await page.evaluate((sel) => {
      const svg = document.querySelector('.l02 svg')
      const letterG = document.querySelector(sel)
      if (!svg || !letterG) return null
      
      const svgRect = svg.getBoundingClientRect()
      const letterRect = letterG.getBoundingClientRect()
      
      // Drop zone center: viewBox y=125 (middle of water gap 80-170)
      // Spread stones from x=100 to x=280 (well within gap 40-340)
      const svgWidth = 380
      const spacing = 180 / 4 // divide space into 4 gaps for 5 stones
      const targetViewBoxX = 100 + spacing * sel.match(/\d+/)[0] * 1
      const targetViewBoxY = 125
      
      const dropX = svgRect.left + (targetViewBoxX / svgWidth) * svgRect.width
      const dropY = svgRect.top + (targetViewBoxY / 250) * svgRect.height
      
      return {
        letterX: letterRect.left + letterRect.width / 2,
        letterY: letterRect.top + letterRect.height / 2,
        dropX,
        dropY,
      }
    }, selector)
    
    if (!positions) {
      await sleep(300)
      continue
    }

    // Perform the drag
    await page.mouse.move(positions.letterX, positions.letterY, { steps: 3 })
    await sleep(80)
    await page.mouse.down()
    await sleep(80)
    await page.mouse.move(positions.dropX, positions.dropY, { steps: 15 })
    await sleep(80)
    await page.mouse.up()
    
    // Wait for stone to appear and fold animation to complete
    await sleep(900)
  }

  // Wait for all stones to finish folding, then traveler to cross
  await sleep(4500)
}
