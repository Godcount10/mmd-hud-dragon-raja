import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { resolveBloodlineOrbitCount, stripCrimsonPlatePixels } from '../../src/hud/themes/dragon-raja/alchemyOrbit'
import AlchemyOrbitBackground from '../../src/hud/themes/dragon-raja/components/AlchemyOrbitBackground.vue'

describe('Dragon Raja alchemy orbit density', () => {
  it.each([
    ['C级 / 普通', 3],
    ['B级', 4],
    ['A级 / 高危躁动', 5],
    ['S级 / 稳定', 6],
    ['SS级', 7],
    ['SSS级', 8],
  ])('maps %s bloodline to %s orbits', (bloodline, expected) => {
    expect(resolveBloodlineOrbitCount(bloodline)).toBe(expected)
  })

  it('uses the minimum density for absent or unrecognised data', () => {
    expect(resolveBloodlineOrbitCount('')).toBe(3)
    expect(resolveBloodlineOrbitCount(undefined)).toBe(3)
    expect(resolveBloodlineOrbitCount('未判定')).toBe(3)
  })

  it('removes crimson plate pixels without erasing neutral linework or gold accents', () => {
    const frame = new Uint8ClampedArray([
      112, 48, 50, 255,
      38, 18, 20, 255,
      106, 106, 108, 255,
      214, 151, 48, 255,
      0, 0, 0, 0,
    ])

    expect(stripCrimsonPlatePixels(frame, 5, 1)).toBe(2)
    expect(Array.from(frame.slice(0, 4))).toEqual([0, 0, 0, 0])
    expect(Array.from(frame.slice(8, 16))).toEqual([
      106, 106, 108, 255,
      214, 151, 48, 255,
    ])
  })

  it('changes every geometry family when the bloodline tier changes', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
    const wrapper = mount(AlchemyOrbitBackground, { props: { orbitCount: 3 } })
    const lowTriangle = wrapper.find('.dr-radar__alchemy-triangles polygon').attributes('points')
    const lowFacet = wrapper.findAll('.dr-radar__alchemy-triangles polygon')[4]?.attributes('points')
    const lowSpokes = wrapper.find('.dr-radar__alchemy-triangles path').attributes('d')
    expect(wrapper.findAll('.dr-radar__alchemy-disc > circle')).toHaveLength(2)
    expect(wrapper.findAll('.dr-radar__alchemy-orbit-markers path')).toHaveLength(3)
    expect(wrapper.findAll('.dr-radar__alchemy-sigils > g')).toHaveLength(3)

    await wrapper.setProps({ orbitCount: 8 })
    await nextTick()
    expect(wrapper.attributes('data-orbit-count')).toBe('8')
    expect(wrapper.find('.dr-radar__alchemy-triangles polygon').attributes('points')).not.toBe(lowTriangle)
    expect(wrapper.findAll('.dr-radar__alchemy-triangles polygon')[4]?.attributes('points')).not.toBe(lowFacet)
    expect(wrapper.find('.dr-radar__alchemy-triangles path').attributes('d')).not.toBe(lowSpokes)
    expect(wrapper.findAll('.dr-radar__alchemy-disc > circle')).toHaveLength(3)
    expect(wrapper.findAll('.dr-radar__alchemy-orbit-markers path')).toHaveLength(8)
    expect(wrapper.findAll('.dr-radar__alchemy-sigils > g')).toHaveLength(8)
    wrapper.unmount()
  })
})
