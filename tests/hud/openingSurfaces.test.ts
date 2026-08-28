import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import WelcomeSurface from '../../src/hud/themes/dragon-raja/components/WelcomeSurface.vue'
import OpeningSurface from '../../src/hud/themes/dragon-raja/components/OpeningSurface.vue'
import { useMotionScope } from '../../src/hud/shared/motion'
import type { OpeningChoiceGroup } from '../../src/hud/themes/dragon-raja/types'

describe('Dragon Raja opening surfaces', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('keeps Welcome mounted until its leave transaction completes', async () => {
    vi.useFakeTimers()
    const wrapper = mount(WelcomeSurface)

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('enterStart')).toHaveLength(1)
    expect(wrapper.emitted('enter')).toBeUndefined()
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()

    await vi.advanceTimersByTimeAsync(470)
    expect(wrapper.emitted('enter')).toHaveLength(1)

    wrapper.unmount()
  })

  it('emits Welcome immediately under reduced motion', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })))
    const wrapper = mount(WelcomeSurface)

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('enter')).toHaveLength(1)

    wrapper.unmount()
  })

  it('advances Opening only once during rapid option clicks', async () => {
    vi.useFakeTimers()
    const wrapper = mount(OpeningSurface)
    const choices = wrapper.findAll('.dr-opening__choices button')

    await choices[0]!.trigger('click')
    await choices[1]!.trigger('click')
    expect(wrapper.get('.dr-opening__counter span').text()).toBe('01')

    await vi.advanceTimersByTimeAsync(200)
    await nextTick()
    expect(wrapper.get('.dr-opening__counter span').text()).toBe('02')

    wrapper.unmount()
  })

  it('supports dense multi-select groups with an enforced selection range', async () => {
    const groups: readonly OpeningChoiceGroup[] = [{
      id: 'talents',
      title: '言灵倾向',
      instruction: '选择两到三项最符合当前角色的能力倾向。',
      options: Array.from({ length: 16 }, (_, index) => `候选能力 ${String(index + 1).padStart(2, '0')}`),
      selectionMode: 'multiple',
      minSelections: 2,
      maxSelections: 3,
    }]
    const wrapper = mount(OpeningSurface, { props: { groups } })
    const choices = wrapper.findAll('.dr-opening__choices button')

    expect(choices).toHaveLength(16)
    expect(wrapper.get('.dr-opening__choices').classes()).toContain('dr-opening__choices--dense')
    expect(wrapper.get('.dr-opening__choices').classes()).toContain('dr-opening__choices--extensive')

    await choices[0]!.trigger('click')
    expect(wrapper.get('.dr-opening__record > footer > button').attributes('disabled')).toBeDefined()

    await choices[1]!.trigger('click')
    expect(wrapper.get('.dr-opening__choice-meta strong').text()).toContain('2 / 3')
    expect(wrapper.get('.dr-opening__record > footer > button').attributes('disabled')).toBeUndefined()

    await choices[2]!.trigger('click')
    expect(choices[3]!.attributes('disabled')).toBeDefined()

    await choices[0]!.trigger('click')
    expect(choices[3]!.attributes('disabled')).toBeUndefined()
    expect(wrapper.get('.dr-opening__record li strong').text()).toContain('候选能力 02、候选能力 03')

    wrapper.unmount()
  })

  it('does not continue Opening navigation after unmount', async () => {
    vi.useFakeTimers()
    const wrapper = mount(OpeningSurface)
    await wrapper.findAll('.dr-opening__choices button')[0]!.trigger('click')

    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(240)

    expect(wrapper.emitted('complete')).toBeUndefined()
  })

  it('retains the mounted surface until a surface transition settles', async () => {
    vi.useFakeTimers()
    let requestedSurface = ref<'story' | 'settings'>('story')
    let mountedSurface = ref<'story' | 'settings'>('story')
    let requestSurface!: (next: 'story' | 'settings') => void

    const Harness = defineComponent({
      setup() {
        const root = ref<HTMLElement | null>(null)
        const motion = useMotionScope({ root })
        requestSurface = (next) => {
          requestedSurface.value = next
          const token = motion.nextGeneration()
          void motion.delay(280, token).then(async (completed) => {
            if (!completed || !motion.isCurrent(token)) return
            mountedSurface.value = next
            await nextTick()
          })
        }
        return () => h('section', { ref: root, 'data-requested': requestedSurface.value }, mountedSurface.value)
      },
    })
    const wrapper = mount(Harness)

    requestSurface('settings')
    await nextTick()
    expect(wrapper.text()).toBe('story')
    expect(wrapper.attributes('data-requested')).toBe('settings')

    await vi.advanceTimersByTimeAsync(280)
    await nextTick()
    expect(wrapper.text()).toBe('settings')

    wrapper.unmount()
  })
})
