// Chalk: click Send, then answer all three questions to open the school gate.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default async function play(page) {
  // Click the send button
  const sendBtn = await page.waitForSelector('[data-qa="send-btn"]')
  await sendBtn.click()
  
  // Wait for all questions to be drawn
  await sleep(3200)
  
  // Answer all three questions by clicking option-1 for each
  // We need to get all option-1 elements (there should be 3, one per question)
  const options = await page.$$('[data-qa="option-1"]')
  for (let i = 0; i < options.length; i++) {
    await sleep(300)
    await options[i].click()
  }
  
  // Wait for the gate to open
  await sleep(1500)
}
