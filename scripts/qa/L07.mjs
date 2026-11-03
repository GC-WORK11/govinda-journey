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
    
    // First line - type and send
    await page.focus('[data-qa="type-input"]')
    await page.type('[data-qa="type-input"]', 'hello from the other side')
    await new Promise(r => setTimeout(r, 400))
    
    // Click the send button via the SVG element
    await page.evaluate(() => {
      const btn = document.querySelector('[data-qa="send-button"]')
      if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    })
    
    // Wait for words to fly and land
    await new Promise(r => setTimeout(r, 2200))
    
    // Second line
    await page.focus('[data-qa="type-input"]')
    // Clear the input first
    await page.evaluate(() => {
      const input = document.querySelector('[data-qa="type-input"]')
      if (input) input.value = ''
    })
    await page.type('[data-qa="type-input"]', 'words that travel far')
    await new Promise(r => setTimeout(r, 400))
    
    // Click send again
    await page.evaluate(() => {
      const btn = document.querySelector('[data-qa="send-button"]')
      if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
    })
    
    // Wait for completion and win animation
    await new Promise(r => setTimeout(r, 3000))
  } else {
    console.log('  WARNING: Type mode not detected, speech API might be available')
    await new Promise(r => setTimeout(r, 2000))
  }
  
  console.log('  L07 QA completed')
}
