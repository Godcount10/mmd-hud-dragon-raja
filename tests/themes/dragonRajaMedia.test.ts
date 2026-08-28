import { describe, expect, it, vi } from 'vitest'

vi.stubGlobal('__DRAGON_RAJA_MEDIA__', {
  welcomePosterUrl: 'http://127.0.0.1:5273/output/welcome-poster.png',
  cassellCrestUrl: 'https://assets.example/cassell-crest.jpg',
  storyDesktopUrl: 'https://assets.example/story-desktop.png',
  storyMobileUrl: 'https://assets.example/story-mobile.png',
  storyPosterUrl: 'https://assets.example/story-poster.png',
  alchemyAssetsUrl: 'https://assets.example/alchemy-assets.png',
  localMapUrl: 'https://assets.example/campus-map.png',
  codexAssetsUrl: 'https://assets.example/codex-assets.png',
  paperGrainUrl: 'https://assets.example/paper-grain.png',
  brushFontUrl: 'https://assets.example/dragon-raja-brush.ttf',
  storySerifFontUrl: 'https://assets.example/story-serif.woff2',
  storySansFontUrl: '',
  storyMonoFontUrl: '',
})

const { dragonRajaMediaCss } = await import('../../src/hud/themes/dragon-raja/media')

describe('Dragon Raja media configuration', () => {
  it('emits configured image URLs and external font faces without inlining assets', () => {
    const css = dragonRajaMediaCss()

    expect(css).toContain('--dr-welcome-poster-image:url("http://127.0.0.1:5273/output/welcome-poster.png")')
    expect(css).toContain('--dr-story-image-desktop:url("https://assets.example/story-desktop.png")')
    expect(css).toContain('--dr-story-image-mobile:url("https://assets.example/story-mobile.png")')
    expect(css).toContain('--dr-story-image-poster:url("https://assets.example/story-poster.png")')
    expect(css).toContain('--dr-alchemy-assets:url("https://assets.example/alchemy-assets.png")')
    expect(css).toContain('--dr-local-map-image:url("https://assets.example/campus-map.png")')
    expect(css).toContain('--dr-codex-assets:url("https://assets.example/codex-assets.png")')
    expect(css).toContain('--dr-paper-grain:url("https://assets.example/paper-grain.png")')
    expect(css).toContain('@font-face{font-family:"DragonRaja Serif Remote";src:url("https://assets.example/story-serif.woff2") format("woff2")')
    expect(css).toContain('@font-face{font-family:"DragonRaja Brush Remote";src:url("https://assets.example/dragon-raja-brush.ttf") format("truetype")')
    expect(css).toContain('--dr-font-brush:"DragonRaja Brush Remote","DragonRaja Brush"')
    expect(css).toContain('--dr-font-serif:"DragonRaja Serif Remote","DragonRaja Serif"')
    expect(css).not.toContain('DragonRaja Sans Remote')
    expect(css).not.toContain('DragonRaja Mono Remote')
    expect(css).not.toContain('data:')
  })
})
