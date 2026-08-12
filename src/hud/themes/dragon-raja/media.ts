export interface DragonRajaMediaManifest {
  storyDesktopUrl: string
  storyMobileUrl: string
  storyPosterUrl: string
  alchemyAssetsUrl: string
  localMapUrl: string
  codexAssetsUrl: string
  paperGrainUrl: string
  storySerifFontUrl: string
  storySansFontUrl: string
  storyMonoFontUrl: string
}

const injectedManifest = __DRAGON_RAJA_MEDIA__

export const DRAGON_RAJA_MEDIA: Readonly<DragonRajaMediaManifest> = Object.freeze({
  storyDesktopUrl: injectedManifest.storyDesktopUrl.trim(),
  storyMobileUrl: injectedManifest.storyMobileUrl.trim(),
  storyPosterUrl: injectedManifest.storyPosterUrl.trim(),
  alchemyAssetsUrl: injectedManifest.alchemyAssetsUrl.trim(),
  localMapUrl: injectedManifest.localMapUrl.trim(),
  codexAssetsUrl: injectedManifest.codexAssetsUrl.trim(),
  paperGrainUrl: injectedManifest.paperGrainUrl.trim(),
  storySerifFontUrl: injectedManifest.storySerifFontUrl.trim(),
  storySansFontUrl: injectedManifest.storySansFontUrl.trim(),
  storyMonoFontUrl: injectedManifest.storyMonoFontUrl.trim(),
})

export function dragonRajaMediaCss(): string {
  const declarations = [
    cssUrlDeclaration('--dr-story-image-desktop', DRAGON_RAJA_MEDIA.storyDesktopUrl),
    cssUrlDeclaration('--dr-story-image-mobile', DRAGON_RAJA_MEDIA.storyMobileUrl || DRAGON_RAJA_MEDIA.storyDesktopUrl),
    cssUrlDeclaration('--dr-story-image-poster', DRAGON_RAJA_MEDIA.storyPosterUrl),
    cssUrlDeclaration('--dr-alchemy-assets', DRAGON_RAJA_MEDIA.alchemyAssetsUrl),
    cssUrlDeclaration('--dr-local-map-image', DRAGON_RAJA_MEDIA.localMapUrl),
    cssUrlDeclaration('--dr-codex-assets', DRAGON_RAJA_MEDIA.codexAssetsUrl),
    cssUrlDeclaration('--dr-paper-grain', DRAGON_RAJA_MEDIA.paperGrainUrl),
    cssUrlDeclaration('--dr-font-serif-source', DRAGON_RAJA_MEDIA.storySerifFontUrl),
    cssUrlDeclaration('--dr-font-sans-source', DRAGON_RAJA_MEDIA.storySansFontUrl),
    cssUrlDeclaration('--dr-font-mono-source', DRAGON_RAJA_MEDIA.storyMonoFontUrl),
  ].filter(Boolean)

  return declarations.length ? `:root{${declarations.join('')}}` : ''
}

function cssUrlDeclaration(name: string, value: string): string {
  if (!value) return ''
  return `${name}:url("${escapeCssString(value)}");`
}

function escapeCssString(value: string): string {
  return value.replace(/["\\\n\r\f]/g, (character) => {
    if (character === '"') return '\\"'
    if (character === '\\') return '\\\\'
    if (character === '\n') return '\\a '
    if (character === '\r') return '\\d '
    return '\\c '
  })
}
