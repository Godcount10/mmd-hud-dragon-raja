import { resolveTheme, type IframeHostConfig } from '../../src/host/HostApp'

describe('Host Theme resolution', () => {
  it('defaults a missing Theme to Dragon Raja', () => {
    expect(resolveTheme(undefined)).toBe('dragon-raja')
    expect(resolveTheme({})).toBe('dragon-raja')
  })

  it('accepts Dragon Raja explicitly', () => {
    expect(resolveTheme({ theme: 'dragon-raja' })).toBe('dragon-raja')
  })

  it.each(['bridge-debug', '', 'unknown', null])('rejects an explicit unsupported Theme: %s', (theme) => {
    const config = { theme } as unknown as IframeHostConfig
    expect(() => resolveTheme(config)).toThrow(/不支持的 HUD Theme/)
  })
})
