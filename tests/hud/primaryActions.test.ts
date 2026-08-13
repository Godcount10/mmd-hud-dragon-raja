import { nextTick, ref, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { ChatSnapshot } from '../../src/contracts'
import type { HudContext } from '../../src/hud/context'
import { HUD_CONTEXT_KEY } from '../../src/hud/context'
import DragonRajaHud from '../../src/hud/themes/dragon-raja/DragonRajaHud.vue'
import { createTestSnapshot } from '../helpers/snapshot'

function mountHud(snapshot: Ref<ChatSnapshot>, invoke = vi.fn(async (action: string) => ({ ok: true as const, action }))) {
  return {
    invoke,
    wrapper: mount(DragonRajaHud, {
      global: {
        provide: { [HUD_CONTEXT_KEY as symbol]: createContext(snapshot, invoke) },
        stubs: {
          WelcomeSurface: { template: '<button class="enter-welcome" @click="$emit(\'enter\')">进入</button>' },
          OpeningSurface: { template: '<button class="enter-story" @click="$emit(\'cancel\')">跳过</button>' },
          StorySurface: { template: '<section class="story-stub" />' },
          NativePanels: { template: '<div />' },
          FeedbackToast: { template: '<div />' },
        },
      },
      attachTo: document.body,
    }),
  }
}

async function enterStory(wrapper: ReturnType<typeof mountHud>['wrapper']): Promise<void> {
  await wrapper.get('.enter-welcome').trigger('click')
  await nextTick()
  await wrapper.get('.enter-story').trigger('click')
  await nextTick()
}

describe('Dragon Raja primary actions', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('keeps refresh and local previews on the primary surface', async () => {
    const snapshot = ref(createTestSnapshot())
    snapshot.value.capabilities.refreshConversation.available = true
    const { wrapper } = mountHud(snapshot)
    await enterStory(wrapper)

    expect(wrapper.find('.dr-primary-actions').text()).toContain('刷新对话')
    expect(wrapper.find('.dr-sidebar').text()).toContain('图鉴')
    // Local previews live on the topbar and sidebar; the right rail is the derived status panel only.
    expect(wrapper.find('.dr-primary-actions').text()).toContain('打开地图')
    expect(wrapper.find('.dr-composer__model').exists()).toBe(false)

    wrapper.unmount()
  })

  it('refreshes the native conversation directly without opening the menu', async () => {
    const snapshot = ref(createTestSnapshot())
    snapshot.value.capabilities.refreshConversation.available = true
    const { wrapper, invoke } = mountHud(snapshot)
    await enterStory(wrapper)

    await wrapper.findAll('.dr-primary-actions button')[0]!.trigger('click')
    await nextTick()

    expect(invoke).toHaveBeenCalledWith('refreshConversation')
    expect(wrapper.find('.dr-menu-layer').exists()).toBe(false)
    wrapper.unmount()
  })
})

function createContext(snapshot: Ref<ChatSnapshot>, invoke: ReturnType<typeof vi.fn>): HudContext {
  return {
    snapshot,
    connection: ref({ status: 'ready', error: null }),
    invoke: invoke as HudContext['invoke'],
    refresh: async () => snapshot.value,
    subscribe: () => () => undefined,
    hideHud: async () => undefined,
    destroyHud: async () => undefined,
  }
}
