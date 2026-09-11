import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import WelcomeSurface from '../../src/hud/themes/dragon-raja/components/WelcomeSurface.vue'
import OpeningSurface from '../../src/hud/themes/dragon-raja/components/OpeningSurface.vue'
import { OPENING_GROUPS } from '../../src/hud/themes/dragon-raja/worldData'
import { useMotionScope } from '../../src/hud/shared/motion'
import type { OpeningChoiceGroup } from '../../src/hud/themes/dragon-raja/types'

describe('Dragon Raja opening surfaces', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('loads the populated Dragon Raja opening groups with the requested constraints', () => {
    expect(OPENING_GROUPS).toHaveLength(5)
    expect(OPENING_GROUPS.find((group) => group.id === 'tier')).toMatchObject({
      title: '阶层与身份',
      selectionMode: 'single',
      options: expect.arrayContaining(['普通阶层 · 普通高中生：只有一沓不及格的试卷和一台旧手机，体能极差，社会关系仅限于老师与同学']),
    })
    expect(OPENING_GROUPS.find((group) => group.id === 'tier')?.options).toHaveLength(30)
    expect(OPENING_GROUPS.find((group) => group.id === 'spirit')).toMatchObject({
      title: '言灵',
      selectionMode: 'multiple',
      minSelections: 0,
      maxSelections: 3,
    })
    expect(OPENING_GROUPS.find((group) => group.id === 'spirit')?.options).toHaveLength(80)
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

  it('keeps Opening on the current group until Continue is clicked', async () => {
    vi.useFakeTimers()
    const wrapper = mount(OpeningSurface)
    const choices = wrapper.findAll('.dr-opening__choices button')

    await choices[0]!.trigger('click')
    expect(wrapper.get('.dr-opening__counter span').text()).toBe('01')

    const continueButton = wrapper.get('.dr-opening__choice-footer > button')
    expect(continueButton.text()).toContain('继续')
    await continueButton.trigger('click')
    expect(wrapper.get('.dr-opening__counter span').text()).toBe('01')

    await vi.advanceTimersByTimeAsync(200)
    await nextTick()
    expect(wrapper.get('.dr-opening__counter span').text()).toBe('02')

    wrapper.unmount()
  })

  it('drives the four-step profile flow from coarse tier and awakening state', async () => {
    vi.useFakeTimers()
    const wrapper = mount(OpeningSurface)

    expect(wrapper.findAll('.dr-opening__steps button')).toHaveLength(4)
    expect(wrapper.get('input[type="text"]').attributes('placeholder')).toBe('输入角色姓名')
    expect(wrapper.findAll('.dr-opening__choices--compact button')).toHaveLength(3)

    await wrapper.get('input[type="text"]').setValue('路明非')
    await wrapper.findAll('.dr-opening__choices--compact button')[0]!.trigger('click')
    await wrapper.get('.dr-opening__choice-footer > button').trigger('click')
    await vi.advanceTimersByTimeAsync(200)
    await nextTick()

    expect(wrapper.findAll('.dr-opening__choices--identity button')).toHaveLength(10)
    await wrapper.find('.dr-opening__choices--identity button').trigger('click')
    await wrapper.get('.dr-opening__choice-footer > button').trigger('click')
    await vi.advanceTimersByTimeAsync(200)
    await nextTick()
    expect(wrapper.get('.dr-opening__notice').text()).toContain('你还未觉醒，一切皆有可能')

    await wrapper.findAll('.dr-opening__steps button')[0]!.trigger('click')
    await vi.advanceTimersByTimeAsync(200)
    await nextTick()
    const profileToggles = wrapper.findAll('.dr-opening__segmented button')
    await profileToggles[profileToggles.length - 1]!.trigger('click')
    await wrapper.findAll('.dr-opening__steps button')[2]!.trigger('click')
    await vi.advanceTimersByTimeAsync(200)
    await nextTick()
    expect(wrapper.find('.dr-opening__notice').exists()).toBe(false)

    await wrapper.get('input[type="range"][aria-label="血统评级"]').setValue(0)
    await wrapper.get('input[type="range"][aria-label="血统稳定性"]').setValue(0)
    expect(wrapper.get('.dr-opening__range-field output').text()).toBe('S级')
    const categoryChoices = wrapper.findAll('.dr-opening__choices--compact button')
    await categoryChoices[categoryChoices.length - 1]!.trigger('click')
    await wrapper.get('.dr-opening__choice-footer > button').trigger('click')
    await vi.advanceTimersByTimeAsync(200)
    await nextTick()

    expect(wrapper.findAll('.dr-opening__choices--multiple button')).toHaveLength(20)
    const spirits = wrapper.findAll('.dr-opening__choices--multiple button')
    await spirits[0]!.trigger('click')
    await spirits[1]!.trigger('click')
    await spirits[2]!.trigger('click')
    expect(wrapper.findAll('.dr-opening__choices--multiple button.selected')).toHaveLength(3)
    expect(spirits[3]!.attributes('disabled')).toBeDefined()

    wrapper.unmount()
  })

  it('removes a single selection and its registration stamp when toggled off', async () => {
    const wrapper = mount(OpeningSurface)
    const choice = wrapper.find('.dr-opening__choices button')

    await choice.trigger('click')
    expect(choice.classes()).toContain('selected')
    expect(wrapper.get('.dr-opening__record li strong').text()).not.toContain('尚未判定')

    await choice.trigger('click')
    expect(choice.classes()).not.toContain('selected')
    expect(choice.get('.dr-opening__stamp').attributes('style')).not.toMatch(/opacity|visibility|transform/)
    expect(wrapper.get('.dr-opening__record li strong').text()).toContain('尚未判定')
    expect(wrapper.get('.dr-opening__choice-footer > button').attributes('disabled')).toBeDefined()

    wrapper.unmount()
  })

  it('supports dense multi-select groups with an enforced selection range', async () => {
    const groups: readonly OpeningChoiceGroup[] = [{
      id: 'talents',
      title: '能力倾向',
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

  it('keeps hierarchy single-select and limits spirits to three', async () => {
    const hierarchyGroups: readonly OpeningChoiceGroup[] = [{
      id: 'tier',
      title: '阶层',
      instruction: '选择角色在学院中的阶层。',
      options: ['普通生', '执行部成员', '专员候补'],
      selectionMode: 'multiple',
      minSelections: 2,
      maxSelections: 3,
    }]
    const hierarchyWrapper = mount(OpeningSurface, { props: { groups: hierarchyGroups } })
    const hierarchyChoices = hierarchyWrapper.findAll('.dr-opening__choices button')

    expect(hierarchyWrapper.get('.dr-opening__choice-meta strong').text()).toBe('单项判定')
    await hierarchyChoices[0]!.trigger('click')
    await hierarchyChoices[1]!.trigger('click')
    expect(hierarchyWrapper.findAll('.dr-opening__choices button.selected')).toHaveLength(1)
    expect(hierarchyWrapper.get('.dr-opening__choice-footer > button').attributes('disabled')).toBeUndefined()
    hierarchyWrapper.unmount()

    const spiritGroups: readonly OpeningChoiceGroup[] = [{
      id: 'spirit',
      title: '言灵',
      instruction: '选择角色的言灵。',
      options: ['君焰', '风王之瞳', '时间零', '刹那'],
      selectionMode: 'multiple',
      maxSelections: 3,
    }]
    const spiritWrapper = mount(OpeningSurface, { props: { groups: spiritGroups } })
    const spiritChoices = spiritWrapper.findAll('.dr-opening__choices button')

    expect(spiritWrapper.get('.dr-opening__choice-meta strong').text()).toContain('0 / 3')
    await spiritChoices[0]!.trigger('click')
    await spiritChoices[1]!.trigger('click')
    await spiritChoices[2]!.trigger('click')
    expect(spiritWrapper.findAll('.dr-opening__choices button.selected')).toHaveLength(3)
    expect(spiritChoices[3]!.attributes('disabled')).toBeDefined()

    spiritWrapper.unmount()
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
