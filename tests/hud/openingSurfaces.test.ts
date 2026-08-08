import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import WelcomeSurface from '../../src/hud/themes/dragon-raja/components/WelcomeSurface.vue'
import OpeningSurface from '../../src/hud/themes/dragon-raja/components/OpeningSurface.vue'
import { useMotionScope } from '../../src/hud/shared/motion'

describe('Dragon Raja opening surfaces', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('keeps Welcome mounted until its leave transaction completes', async () => {
    vi.useFakeTimers()
    const wrapper = mount(WelcomeSurface)

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('enter')).toBeUndefined()

    await vi.advanceTimersByTimeAsync(800)
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
