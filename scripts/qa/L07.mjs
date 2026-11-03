/**
 * QA script for L07 Wispr Wrap
 * Simulates typing two lines (fallback to type mode since speech isn't reliable in headless)
 */

export default async function play(page) {
  // Wait for game to load
  await page.waitForSelector('.l07-stage', { timeout: 5000 })
  
  // Wait a moment for mode detection (should fallback to type mode in headless)
  await new Promise(r => setTimeout(r, 800))
  
  // Check if we're in type mode or speech mode
  const hasTypeInput = await page.$('[data-qa="type-input"]')
  
  if (hasTypeInput) {
    // Type mode flow
    console.log('  Using type mode')
    
    // First line
    await page.type('[data-qa="type-input"]', 'hello from the other side')
    await new Promise(r => setTimeout(r, 300))
    await page.click('[data-qa="send-button"]')
    
    // Wait for words to fly and land
    await new Promise(r => setTimeout(r, 2000))
    
    // Second line
    await page.type('[data-qa="type-input"]', 'words that travel far')
    await new Promise(r => setTimeout(r, 300))
    await page.click('[data-qa="send-button"]')
    
    // Wait for completion
    await new Promise(r => setTimeout(r, 2500))
  } else {
    // Speech mode flow (fallback - try to interact with mic zone)
    console.log('  Attempting speech mode interaction')
    
    // Since speech API won't work in headless, we'll try the mic zone
    // but the game should auto-fallback to type mode in most cases
    const micZone = await page.$('[data-qa="mic-zone"]')
    
    if (micZone) {
      // Hold and release mic (won't actually record, but tests interaction)
      await page.evaluate(() => {
        const zone = document.querySelector('[data-qa="mic-zone"]')
        if (zone) {
          zone.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
          setTimeout(() => {
            zone.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
          }, 1500)
        }
      })
      
      await new Promise(r => setTimeout(r, 3000))
    }
  }
  
  // Give extra time for win animation
  await new Promise(r => setTimeout(r, 1000))
  
  console.log('  L07 QA completed')
}
