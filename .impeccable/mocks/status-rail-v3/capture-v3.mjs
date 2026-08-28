import { chromium } from '../../live/playwright-check/node_modules/playwright-core/index.mjs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdir } from 'node:fs/promises'

const root = dirname(fileURLToPath(import.meta.url))
const html = pathToFileURL(join(root, 'status-rail-comp-v3.html')).href
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader', '--disable-dev-shm-usage'],
})
await mkdir(root, { recursive: true })

for (let variant = 1; variant <= 3; variant += 1) {
  const desktop = await browser.newContext({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 })
  const desktopPage = await desktop.newPage()
  await desktopPage.goto(`${html}?variant=${variant}`, { waitUntil: 'load' })
  await desktopPage.waitForFunction(() => window.__compReady === true)
  await desktopPage.waitForTimeout(420)
  await desktopPage.screenshot({ path: join(root, `status-rail-v3-0${variant}-desktop.png`), fullPage: false })
  await desktop.close()

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const mobilePage = await mobile.newPage()
  await mobilePage.goto(`${html}?variant=${variant}`, { waitUntil: 'load' })
  await mobilePage.waitForFunction(() => window.__compReady === true)
  await mobilePage.waitForTimeout(420)
  await mobilePage.screenshot({ path: join(root, `status-rail-v3-0${variant}-mobile-collapsed.png`), fullPage: false })
  await mobilePage.goto(`${html}?variant=${variant}&mobile=open`, { waitUntil: 'load' })
  await mobilePage.waitForFunction(() => window.__compReady === true)
  await mobilePage.waitForTimeout(420)
  await mobilePage.screenshot({ path: join(root, `status-rail-v3-0${variant}-mobile-open.png`), fullPage: false })
  await mobile.close()
}

await browser.close()
console.log('Captured three v3 desktop comps and three mobile overlay comps.')
