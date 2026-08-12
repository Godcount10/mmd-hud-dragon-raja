import { describe, expect, it, vi } from 'vitest'

vi.stubGlobal('__DRAGON_RAJA_MEDIA__', {
  storyDesktopUrl: 'https://assets.example/story-desktop.png',
  storyMobileUrl: 'https://assets.example/story-mobile.png',
  storyPosterUrl: 'https://assets.example/story-poster.png',
  alchemyAssetsUrl: 'https://assets.example/alchemy-assets.png',
  localMapUrl: 'https://assets.example/campus-map.png',
  codexAssetsUrl: 'https://assets.example/codex-assets.png',
  paperGrainUrl: 'https://assets.example/paper-grain.png',
  storySerifFontUrl: 'https://assets.example/story-serif.woff2',
  storySansFontUrl: '',
  storyMonoFontUrl: '',
})

const { dragonRajaMediaCss } = await import('../../src/hud/themes/dragon-raja/media')

describe('Dragon Raja media configuration', () => {
  it('emits only configured media URLs as CSS variables', () => {
    const css = dragonRajaMediaCss()

    expect(css).toContain('--dr-story-image-desktop:url("https://assets.example/story-desktop.png")')
    expect(css).toContain('--dr-story-image-mobile:url("https://assets.example/story-mobile.png")')
    expect(css).toContain('--dr-story-image-poster:url("https://assets.example/story-poster.png")')
    expect(css).toContain('--dr-alchemy-assets:url("https://assets.example/alchemy-assets.png")')
    expect(css).toContain('--dr-local-map-image:url("https://assets.example/campus-map.png")')
    expect(css).toContain('--dr-codex-assets:url("https://assets.example/codex-assets.png")')
    expect(css).toContain('--dr-paper-grain:url("https://assets.example/paper-grain.png")')
    expect(css).toContain('--dr-font-serif-source:url("https://assets.example/story-serif.woff2")')
    expect(css).not.toContain('--dr-font-sans-source')
    expect(css).not.toContain('--dr-font-mono-source')
  })
})
