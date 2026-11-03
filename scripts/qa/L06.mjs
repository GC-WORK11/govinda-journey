/**
 * QA script for L06 Remote
 * Taps task chips, approves completed tasks, wins after 2 tasks
 */

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export default async function play(page) {
  // Wait for game to be ready
  await page.waitForSelector('[data-qa="task-chip-1"]', { timeout: 5000 })
  await wait(500)

  // Send first task
  await page.click('[data-qa="task-chip-1"]')
  
  // Wait for coding to complete and approve button to appear (coding animation is ~4s)
  await page.waitForSelector('[data-qa="approve-btn"]', { timeout: 8000 })
  await wait(300)
  
  // Approve first task
  await page.click('[data-qa="approve-btn"]')
  await wait(800)

  // Send second task
  await page.click('[data-qa="task-chip-2"]')
  
  // Wait for coding to complete and approve button to appear
  await page.waitForSelector('[data-qa="approve-btn"]', { timeout: 8000 })
  await wait(300)
  
  // Approve second task
  await page.click('[data-qa="approve-btn"]')
  
  // Wait a bit for win condition
  await wait(1000)
}
