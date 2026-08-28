import { installMockMmd } from '../../src/dev/mockMmd'
import { HostApp, assertFrameScriptUrlAllowed, resolveFrameScriptUrl, resolveTheme, type IframeHostApi, type IframeHostConfig } from '../../src/host/HostApp'

installMockMmd()

const INSTANCE_KEY = '__MMD_HUD_IFRAME__' as const
const devBuildId = import.meta.env.VITE_MMD_HUD_BUILD_ID || 'dev'
const devFrameScriptUrl = import.meta.env.VITE_MMD_HUD_DEV_FRAME_SCRIPT_URL || 'http://127.0.0.1:5273/mmd-hud-iframe-frame.js'
const DEV_LIVE_SCRIPT_ID = 'mmd-dev-impeccable-live'

declare global {
  interface Window {
    __MMD_HUD_IFRAME__?: IframeHostApi
    __MMD_HUD_IFRAME_CONFIG__?: IframeHostConfig
  }
}

window.__MMD_HUD_IFRAME_CONFIG__ = {
  frameScriptUrl: devFrameScriptUrl,
  theme: 'dragon-raja',
}

function findCurrentLiveScriptUrl(): string | null {
  for (const script of document.scripts) {
    if (!script.src) continue
    try {
      const url = new URL(script.src)
      const isLoopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
      if (isLoopback && url.port === '8400' && url.pathname === '/live.js') return url.href
    } catch {
      // Ignore unrelated script URLs that cannot be parsed.
    }
  }
  return null
}

function installDevLiveBridge(): void {
  let observedFrame: HTMLIFrameElement | null = null
  let observer: MutationObserver | null = null

  const attach = (): boolean => {
    const liveScriptUrl = findCurrentLiveScriptUrl()
    const frame = document.querySelector<HTMLIFrameElement>('#mmd-hud-iframe-host iframe')
    if (!liveScriptUrl || !frame) return false

    if (frame !== observedFrame) {
      observedFrame?.removeEventListener('load', attach)
      observedFrame = frame
      observedFrame.addEventListener('load', attach)
    }

    const frameDocument = frame.contentDocument
    if (!frameDocument?.body) return false
    const existing = frameDocument.getElementById(DEV_LIVE_SCRIPT_ID)
    if (existing instanceof HTMLScriptElement && existing.src === liveScriptUrl) return true
    existing?.remove()

    const script = frameDocument.createElement('script')
    script.id = DEV_LIVE_SCRIPT_ID
    script.src = liveScriptUrl
    script.dataset.mmdDevOnly = 'true'
    frameDocument.body.append(script)
    return true
  }

  observer = new MutationObserver(() => {
    if (attach()) observer?.disconnect()
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
  if (attach()) observer.disconnect()

  window.setTimeout(() => observer?.disconnect(), 10_000)
}

async function boot(): Promise<void> {
  const existing = window[INSTANCE_KEY]
  if (existing) {
    existing.refresh()
    installDevLiveBridge()
    return
  }

  const config = window.__MMD_HUD_IFRAME_CONFIG__
  const frameScriptUrl = resolveFrameScriptUrl(config)
  const theme = resolveTheme(config)
  if (frameScriptUrl) assertFrameScriptUrlAllowed(frameScriptUrl)

  const app = new HostApp(frameScriptUrl, config?.frameScriptSource, theme, devBuildId, () => {
    if (window[INSTANCE_KEY] === api) delete window[INSTANCE_KEY]
  })
  const api = app.getApi()
  window[INSTANCE_KEY] = api
  try {
    await app.start()
    installDevLiveBridge()
  } catch (error) {
    app.destroy()
    throw error
  }
}

if (document.body) void boot()
else document.addEventListener('DOMContentLoaded', () => void boot(), { once: true })
