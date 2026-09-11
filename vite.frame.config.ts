import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { frameCssInjectionPlugin } from './build/frameCssInjection'

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }
const frameOutDir = process.env.MMD_HUD_FRAME_OUT_DIR ?? 'dist/frame'
const DEFAULT_DRAGON_RAJA_WELCOME_POSTER_URL =
  'https://meimoaiimg.com/user/701473/image-1787581608135.jpg?i=1344574'
const DEFAULT_DRAGON_RAJA_BRUSH_FONT_URL =
  'https://meimoaiimg.com/user/701473/ma-shan-zheng-dragon-raja.ttf?i=1344575'

const dragonRajaMedia = {
  welcomePosterUrl: process.env.DRAGON_RAJA_WELCOME_POSTER_URL ?? DEFAULT_DRAGON_RAJA_WELCOME_POSTER_URL,
  cassellCrestUrl: process.env.DRAGON_RAJA_CASSELL_CREST_URL ?? '',
  storyDesktopUrl: process.env.DRAGON_RAJA_STORY_DESKTOP_URL ?? '',
  storyMobileUrl: process.env.DRAGON_RAJA_STORY_MOBILE_URL ?? '',
  storyPosterUrl: process.env.DRAGON_RAJA_STORY_POSTER_URL ?? '',
  alchemyAssetsUrl: process.env.DRAGON_RAJA_ALCHEMY_ASSETS_URL ?? '',
  localMapUrl: process.env.DRAGON_RAJA_LOCAL_MAP_URL ?? '',
  codexAssetsUrl: process.env.DRAGON_RAJA_CODEX_ASSETS_URL ?? '',
  paperGrainUrl: process.env.DRAGON_RAJA_PAPER_GRAIN_URL ?? '',
  brushFontUrl: process.env.DRAGON_RAJA_BRUSH_FONT_URL ?? DEFAULT_DRAGON_RAJA_BRUSH_FONT_URL,
  storySerifFontUrl: process.env.DRAGON_RAJA_SERIF_FONT_URL ?? '',
  storySansFontUrl: process.env.DRAGON_RAJA_SANS_FONT_URL ?? '',
  storyMonoFontUrl: process.env.DRAGON_RAJA_MONO_FONT_URL ?? '',
}

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    __MMD_HUD_BUILD_ID__: JSON.stringify(process.env.MMD_HUD_BUILD_ID ?? 'dev'),
    __MMD_HUD_VERSION__: JSON.stringify(packageJson.version),
    __DRAGON_RAJA_MEDIA__: JSON.stringify(dragonRajaMedia),
  },
  plugins: [vue(), frameCssInjectionPlugin()],
  build: {
    outDir: frameOutDir,
    emptyOutDir: true,
    lib: {
      entry: 'src/frame/main.ts',
      formats: ['iife'],
      name: 'MmdHudIframeFrame',
      fileName: () => 'mmd-hud-iframe-frame.js',
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
})
