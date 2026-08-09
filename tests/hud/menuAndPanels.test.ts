import { nextTick, ref, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { ChatSnapshot } from '../../src/contracts'
import type { HudContext } from '../../src/hud/context'
import { HUD_CONTEXT_KEY } from '../../src/hud/context'
import LocalMenu from '../../src/hud/themes/dragon-raja/components/LocalMenu.vue'
import NativePanels from '../../src/hud/themes/dragon-raja/components/NativePanels.vue'
import { createTestSnapshot } from '../helpers/snapshot'

function mountMenu() {
  return mount(LocalMenu, {
    props: { statuses: [] },
    attachTo: document.body,
  })
}

describe('Dragon Raja menu motion and focus', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('contains only low-frequency management actions', () => {
    const wrapper = mountMenu()
    const text = wrapper.text()

    expect(text).toContain('管理存档')
    expect(text).toContain('用户人设')
    expect(text).toContain('补充设定')
    expect(text).toContain('系统设置')
    expect(text).toContain('退出角色卡')
    expect(text).not.toContain('模型与参数')
    expect(text).not.toContain('刷新原生对话')
    expect(text).not.toContain('图鉴档案')
    expect(text).not.toContain('城市节点图')

    wrapper.unmount()
  })

  it('waits for the reverse transaction before emitting a business action', async () => {
    vi.useFakeTimers()
    const wrapper = mountMenu()
    const archive = wrapper.findAll('.dr-menu__panel nav button').find((button) => button.text().includes('管理存档'))!

    await archive.trigger('click')
    expect(wrapper.emitted('archives')).toBeUndefined()
    expect(wrapper.findAll('.dr-menu__panel nav button').every((button) => button.attributes('disabled') !== undefined)).toBe(true)

    await vi.advanceTimersByTimeAsync(560)
    expect(wrapper.emitted('archives')).toHaveLength(1)
    expect(wrapper.emitted('close')).toBeUndefined()

    wrapper.unmount()
  })

  it('accepts only the first rapid business action and cancels it after unmount', async () => {
    vi.useFakeTimers()
    const wrapper = mountMenu()
    const actions = wrapper.findAll('.dr-menu__panel nav button')

    await actions[0]!.trigger('click')
    await actions[1]!.trigger('click')
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(600)

    expect(wrapper.emitted('archives')).toBeUndefined()
    expect(wrapper.emitted('persona')).toBeUndefined()
  })

  it('waits for the reverse close transaction before unmount notification', async () => {
    vi.useFakeTimers()
    const wrapper = mountMenu()

    await wrapper.get('.dr-menu__panel header button').trigger('click')
    expect(wrapper.emitted('close')).toBeUndefined()

    await vi.advanceTimersByTimeAsync(560)
    expect(wrapper.emitted('close')).toHaveLength(1)

    wrapper.unmount()
  })

  it('closes from Escape and traps Tab at the menu boundary', async () => {
    vi.useFakeTimers()
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    const wrapper = mountMenu()
    await nextTick()
    const buttons = wrapper.findAll<HTMLElement>('button:not([disabled])')
    const last = buttons[buttons.length - 1]!.element
    last.focus()
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    window.dispatchEvent(tab)
    expect(document.activeElement).toBe(buttons[0]!.element)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    await vi.advanceTimersByTimeAsync(560)
    expect(wrapper.emitted('close')).toHaveLength(1)

    wrapper.unmount()
    expect(document.activeElement).toBe(outside)
  })
})

describe('Dragon Raja native panel presence', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('retains the last Snapshot panel until its leave animation completes', async () => {
    vi.useFakeTimers()
    const snapshot = ref(createTestSnapshot())
    snapshot.value.modelPanel.open = true
    snapshot.value.modelPanel.title = '模型选择'
    const context = createContext(snapshot)
    const wrapper = mount(NativePanels, {
      global: { provide: { [HUD_CONTEXT_KEY as symbol]: context } },
      attachTo: document.body,
    })
    await nextTick()
    expect(wrapper.find('.dr-native-layer').exists()).toBe(true)

    snapshot.value = {
      ...snapshot.value,
      revision: 2,
      modelPanel: { ...snapshot.value.modelPanel, open: false },
    }
    await nextTick()
    expect(wrapper.find('.dr-native-layer').exists()).toBe(true)

    await vi.advanceTimersByTimeAsync(440)
    await nextTick()
    expect(wrapper.find('.dr-native-layer').exists()).toBe(false)

    wrapper.unmount()
  })

  it('cancels a stale leave when a new Snapshot panel opens', async () => {
    vi.useFakeTimers()
    const snapshot = ref(createTestSnapshot())
    snapshot.value.modelPanel.open = true
    const context = createContext(snapshot)
    const wrapper = mount(NativePanels, {
      global: { provide: { [HUD_CONTEXT_KEY as symbol]: context } },
    })
    await nextTick()

    snapshot.value = {
      ...snapshot.value,
      revision: 2,
      modelPanel: { ...snapshot.value.modelPanel, open: false },
    }
    await nextTick()
    snapshot.value = {
      ...snapshot.value,
      revision: 3,
      conversationPanel: { ...snapshot.value.conversationPanel, open: true, title: '管理存档' },
    }
    await nextTick()
    await vi.advanceTimersByTimeAsync(440)
    await nextTick()

    expect(wrapper.find('.dr-native-layer').exists()).toBe(true)
    expect(wrapper.text()).toContain('管理存档')

    wrapper.unmount()
  })

  it('switches nested Snapshot content without unmounting the dialog shell', async () => {
    vi.useFakeTimers()
    const snapshot = ref(createTestSnapshot())
    snapshot.value.modelPanel.open = true
    snapshot.value.modelPanel.title = '模型选择'
    const wrapper = mount(NativePanels, {
      global: { provide: { [HUD_CONTEXT_KEY as symbol]: createContext(snapshot) } },
      attachTo: document.body,
    })
    await nextTick()
    const shell = wrapper.get('.dr-native-layer').element

    snapshot.value = {
      ...snapshot.value,
      revision: 2,
      modelPanel: { ...snapshot.value.modelPanel, open: false },
      modelConfiguration: { ...snapshot.value.modelConfiguration, open: true, title: '模型参数' },
    }
    await nextTick()
    expect(wrapper.get('.dr-native-layer').element).toBe(shell)
    expect(wrapper.get('.dr-native-panel').attributes('data-panel')).toBe('models')
    expect(wrapper.get('.dr-native-layer').attributes('aria-busy')).toBe('true')

    await vi.advanceTimersByTimeAsync(220)
    await nextTick()
    expect(wrapper.get('.dr-native-panel').attributes('data-panel')).toBe('model-config')
    expect(wrapper.text()).toContain('模型参数')

    wrapper.unmount()
  })

  it('lands on the latest Snapshot panel during rapid nested switches', async () => {
    vi.useFakeTimers()
    const snapshot = ref(createTestSnapshot())
    snapshot.value.modelPanel.open = true
    const wrapper = mount(NativePanels, {
      global: { provide: { [HUD_CONTEXT_KEY as symbol]: createContext(snapshot) } },
    })
    await nextTick()

    snapshot.value = {
      ...snapshot.value,
      revision: 2,
      modelPanel: { ...snapshot.value.modelPanel, open: false },
      modelConfiguration: { ...snapshot.value.modelConfiguration, open: true, title: '模型参数' },
    }
    await nextTick()
    snapshot.value = {
      ...snapshot.value,
      revision: 3,
      modelConfiguration: { ...snapshot.value.modelConfiguration, open: false },
      conversationPanel: { ...snapshot.value.conversationPanel, open: true, title: '管理存档' },
    }
    await nextTick()
    await vi.advanceTimersByTimeAsync(240)
    await nextTick()

    expect(wrapper.get('.dr-native-panel').attributes('data-panel')).toBe('archives')
    expect(wrapper.text()).toContain('管理存档')
    wrapper.unmount()
  })

  it('restores the original external focus after nested Snapshot panels close', async () => {
    vi.useFakeTimers()
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    const snapshot = ref(createTestSnapshot())
    snapshot.value.modelPanel.open = true
    const wrapper = mount(NativePanels, {
      global: { provide: { [HUD_CONTEXT_KEY as symbol]: createContext(snapshot) } },
      attachTo: document.body,
    })
    await nextTick()

    snapshot.value = {
      ...snapshot.value,
      revision: 2,
      modelPanel: { ...snapshot.value.modelPanel, open: false },
      modelConfiguration: { ...snapshot.value.modelConfiguration, open: true, title: '模型设置' },
    }
    await nextTick()
    snapshot.value = {
      ...snapshot.value,
      revision: 3,
      modelConfiguration: { ...snapshot.value.modelConfiguration, open: false },
    }
    await nextTick()
    await vi.advanceTimersByTimeAsync(440)
    await nextTick()

    expect(document.activeElement).toBe(outside)
    wrapper.unmount()
  })
})

function createContext(snapshot: Ref<ChatSnapshot>): HudContext {
  return {
    snapshot,
    connection: ref({ status: 'ready', error: null }),
    invoke: async (action) => ({ ok: true, action }),
    refresh: async () => snapshot.value,
    subscribe: () => () => undefined,
    hideHud: async () => undefined,
    destroyHud: async () => undefined,
  }
}
