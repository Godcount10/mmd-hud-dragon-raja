import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { useMotionScope, type MotionScope } from '../../src/hud/shared/motion/useMotionScope'
import { usePresenceTransition, type PresenceTransition } from '../../src/hud/shared/motion/usePresenceTransition'

interface MotionHarness {
  motion: MotionScope
  wrapper: VueWrapper
}

function mountMotionHarness(): MotionHarness {
  let motion!: MotionScope
  const Harness = defineComponent({
    setup() {
      motion = useMotionScope()
      return () => h('div')
    },
  })
  const wrapper = mount(Harness)
  return { motion, wrapper }
}

interface PresenceHarness {
  visible: Ref<boolean>
  presence: PresenceTransition
  wrapper: VueWrapper
}

function mountPresenceHarness(initialVisible = false, duration = 120): PresenceHarness {
  let visible!: Ref<boolean>
  let presence!: PresenceTransition
  const Harness = defineComponent({
    setup() {
      visible = ref(initialVisible)
      const motion = useMotionScope()
      presence = usePresenceTransition(visible, motion, duration)
      return () => h('div', {
        'data-phase': presence.phase.value,
        'data-mounted': String(presence.mounted.value),
      })
    },
  })
  const wrapper = mount(Harness)
  return { visible, presence, wrapper }
}

describe('useMotionScope', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('runs callbacks in the GSAP context and tracks timelines for cleanup', () => {
    const { motion, wrapper } = mountMotionHarness()
    const result = motion.run(() => 'scoped-result')
    const timeline = motion.timeline({ paused: true })
    const kill = vi.spyOn(timeline, 'kill')

    expect(result).toBe('scoped-result')
    expect(motion.disposed.value).toBe(false)

    wrapper.unmount()

    expect(kill).toHaveBeenCalled()
    expect(motion.disposed.value).toBe(true)
    expect(motion.isCurrent(motion.generation.value)).toBe(false)
  })

  it('invalidates delayed work when a newer generation starts', async () => {
    vi.useFakeTimers()
    const { motion, wrapper } = mountMotionHarness()
    const token = motion.generation.value
    const pending = motion.delay(200, token)

    motion.nextGeneration()
    await vi.advanceTimersByTimeAsync(200)

    await expect(pending).resolves.toBe(false)
    wrapper.unmount()
  })

  it('resolves pending delays as cancelled during unmount', async () => {
    vi.useFakeTimers()
    const { motion, wrapper } = mountMotionHarness()
    const pending = motion.delay(500)

    wrapper.unmount()

    await expect(pending).resolves.toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('completes delays immediately when reduced motion is enabled', async () => {
    const mediaQuery = {
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery))
    const { motion, wrapper } = mountMotionHarness()

    await expect(motion.delay(500)).resolves.toBe(true)
    expect(mediaQuery.addEventListener).toHaveBeenCalledOnce()

    wrapper.unmount()
    expect(mediaQuery.removeEventListener).toHaveBeenCalledOnce()
  })

  it('removes the media-query listener when the scope is unmounted', () => {
    const mediaQuery = {
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery))
    const { wrapper } = mountMotionHarness()

    wrapper.unmount()

    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})

describe('usePresenceTransition', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('keeps the element mounted through enter and leave phases', async () => {
    vi.useFakeTimers()
    const { presence, wrapper } = mountPresenceHarness(false)

    expect(presence.phase.value).toBe('closed')
    expect(presence.mounted.value).toBe(false)

    const entering = presence.show()
    await nextTick()
    expect(presence.phase.value).toBe('entering')
    expect(presence.mounted.value).toBe(true)
    await vi.advanceTimersByTimeAsync(120)
    await expect(entering).resolves.toBe(true)
    expect(presence.phase.value).toBe('open')

    const leaving = presence.hide()
    await nextTick()
    expect(presence.phase.value).toBe('leaving')
    expect(presence.mounted.value).toBe(true)
    await vi.advanceTimersByTimeAsync(120)
    await expect(leaving).resolves.toBe(true)
    expect(presence.phase.value).toBe('closed')
    expect(presence.mounted.value).toBe(false)

    wrapper.unmount()
  })

  it('invalidates a stale leave when the presence reopens quickly', async () => {
    vi.useFakeTimers()
    const { presence, wrapper } = mountPresenceHarness(true)

    const leaving = presence.hide()
    expect(presence.phase.value).toBe('leaving')
    const reopening = presence.show()
    expect(presence.phase.value).toBe('entering')

    await vi.advanceTimersByTimeAsync(120)
    await expect(leaving).resolves.toBe(false)
    await expect(reopening).resolves.toBe(true)
    expect(presence.phase.value).toBe('open')
    expect(presence.mounted.value).toBe(true)

    wrapper.unmount()
  })

  it('reacts to external visibility and completes synchronously for reduced motion', async () => {
    const mediaQuery = {
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery))
    const { visible, presence, wrapper } = mountPresenceHarness(false, 300)

    visible.value = true
    await nextTick()
    expect(presence.phase.value).toBe('open')
    expect(presence.mounted.value).toBe(true)

    visible.value = false
    await nextTick()
    expect(presence.phase.value).toBe('closed')
    expect(presence.mounted.value).toBe(false)

    wrapper.unmount()
  })

  it('does not settle a transition after unmount', async () => {
    vi.useFakeTimers()
    const { presence, wrapper } = mountPresenceHarness(false)
    const entering = presence.show()

    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(120)

    await expect(entering).resolves.toBe(false)
    expect(presence.phase.value).toBe('entering')
  })
})
