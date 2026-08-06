import { installMockMmd } from '../../src/dev/mockMmd'

installMockMmd()

window.__MMD_HUD_IFRAME_CONFIG__ = {
  frameScriptUrl: 'http://127.0.0.1:5273/mmd-hud-iframe-frame.js',
  theme: 'bridge-debug',
}

void import('../../src/host/main')
