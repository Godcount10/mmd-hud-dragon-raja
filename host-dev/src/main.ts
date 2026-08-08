import { installMockMmd } from '../../src/dev/mockMmd'

installMockMmd()

const requestedTheme = new URLSearchParams(window.location.search).get('theme')

window.__MMD_HUD_IFRAME_CONFIG__ = {
  frameScriptUrl: 'http://127.0.0.1:5273/mmd-hud-iframe-frame.js',
  theme: requestedTheme === 'bridge-debug' ? 'bridge-debug' : 'dragon-raja',
}

void import('../../src/host/main')
