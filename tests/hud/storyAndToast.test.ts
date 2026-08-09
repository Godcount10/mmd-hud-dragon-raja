import { nextTick, ref, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { ChatMessage, ChatSnapshot } from '../../src/contracts'
import type { HudContext } from '../../src/hud/context'
import { HUD_CONTEXT_KEY } from '../../src/hud/context'
import FeedbackToast from '../../src/hud/themes/dragon-raja/components/FeedbackToast.vue'
import StorySurface from '../../src/hud/themes/dragon-raja/components/StorySurface.vue'
import DragonRajaHud from '../../src/hud/themes/dragon-raja/DragonRajaHud.vue'
import { createTestSnapshot } from '../helpers/snapshot'

function message(id: string, role: ChatMessage['role'], text = id, streaming = false): ChatMessage {
  return {
    id,
    role,
    index: Number(id.replace(/\D/g, '')) || 0,
    text,
    html: text,
    streaming,
    capabilities: {
      copy: false,
      edit: false,
      delete: false,
      regenerate: false,
      rollback: false,
      startNewStory: false,
      previousBranch: false,
      nextBranch: false,
    },
  }
}

function mountStory(snapshot: Ref<ChatSnapshot>) {
  return mount(StorySurface, {
    global: { provide: { [HUD_CONTEXT_KEY as symbol]: createContext(snapshot) } },
    attachTo: document.body,
  })
}

describe('Dragon Raja story motion', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('seeds historical message IDs and animates every newly introduced message once', async () => {
    vi.useFakeTimers()
    const snapshot = ref(createTestSnapshot())
    snapshot.value.messages = [message('m1', 'assistant')]
    const wrapper = mountStory(snapshot)
    await nextTick()
    const historical = wrapper.get('[data-message-id="m1"]').element as HTMLElement
    expect(historical.style.opacity).toBe('')

    snapshot.value = {
      ...snapshot.value,
      revision: 2,
      messages: [...snapshot.value.messages, message('m2', 'user'), message('m3', 'assistant')],
    }
    await nextTick()
    expect(wrapper.findAll('.dr-message')).toHaveLength(3)
    expect(wrapper.get('[data-message-id="m2"]').classes()).toContain('dr-message--fresh')
    expect(wrapper.get('[data-message-id="m3"]').classes()).toContain('dr-message--fresh')

    await vi.advanceTimersByTimeAsync(700)
    wrapper.unmount()
  })

  it('treats a disjoint idle message set as loaded history, then animates later increments', async () => {
    vi.useFakeTimers()
    const snapshot = ref(createTestSnapshot())
    snapshot.value.messages = [message('old-1', 'assistant'), message('old-2', 'user')]
    const wrapper = mountStory(snapshot)
    await nextTick()

    snapshot.value = {
      ...snapshot.value,
      revision: 2,
      messages: [message('new-10', 'assistant'), message('new-11', 'user')],
      generation: { status: 'idle', messageId: null },
    }
    await nextTick()
    expect(wrapper.findAll('.dr-message--fresh')).toHaveLength(0)
    expect(wrapper.get('.dr-story__messages').classes()).toContain('dr-story__messages--replacing')

    await vi.advanceTimersByTimeAsync(360)
    await nextTick()
    expect(wrapper.get('.dr-story__messages').classes()).not.toContain('dr-story__messages--replacing')

    snapshot.value = {
      ...snapshot.value,
      revision: 3,
      messages: [...snapshot.value.messages, message('new-12', 'assistant')],
    }
    await nextTick()
    expect(wrapper.get('[data-message-id="new-12"]').classes()).toContain('dr-message--fresh')

    wrapper.unmount()
  })

  it('still treats the first message after an empty history as new', async () => {
    vi.useFakeTimers()
    const snapshot = ref(createTestSnapshot())
    const wrapper = mountStory(snapshot)
    await nextTick()

    snapshot.value = {
      ...snapshot.value,
      revision: 2,
      messages: [message('first-1', 'assistant')],
    }
    await nextTick()

    expect(wrapper.get('[data-message-id="first-1"]').classes()).toContain('dr-message--fresh')
    expect(wrapper.get('.dr-story__messages').classes()).not.toContain('dr-story__messages--replacing')
    wrapper.unmount()
  })

  it('does not replay the entrance when an existing streaming message changes', async () => {
    vi.useFakeTimers()
    const snapshot = ref(createTestSnapshot())
    snapshot.value.messages = [message('m1', 'assistant', '开始', true)]
    const wrapper = mountStory(snapshot)
    await nextTick()

    snapshot.value = {
      ...snapshot.value,
      revision: 2,
      messages: [message('m1', 'assistant', '开始与继续', true)],
    }
    await nextTick()
    const existing = wrapper.get('[data-message-id="m1"]').element as HTMLElement
    expect(existing.style.opacity).toBe('')

    wrapper.unmount()
  })

  it('calibrates a completed generation once without replaying message entrance', async () => {
    vi.useFakeTimers()
    const snapshot = ref(createTestSnapshot())
    snapshot.value.messages = [message('m1', 'assistant', '生成中', true)]
    snapshot.value.generation = { status: 'streaming', messageId: 'm1' }
    const wrapper = mountStory(snapshot)
    await nextTick()

    snapshot.value = {
      ...snapshot.value,
      revision: 2,
      messages: [message('m1', 'assistant', '生成完成')],
      generation: { status: 'idle', messageId: null },
    }
    await nextTick()
    const completed = wrapper.get('[data-message-id="m1"]').element as HTMLElement
    expect(completed.classList.contains('dr-message--fresh')).toBe(false)

    snapshot.value = {
      ...snapshot.value,
      revision: 3,
      generation: { status: 'streaming', messageId: 'm1' },
    }
    await nextTick()
    snapshot.value = {
      ...snapshot.value,
      revision: 4,
      generation: { status: 'idle', messageId: null },
    }
    await nextTick()
    expect(completed.classList.contains('dr-message--fresh')).toBe(false)

    wrapper.unmount()
  })
})

describe('Dragon Raja status feedback', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('highlights only real assistant-derived status changes and clears the feedback', async () => {
    vi.useFakeTimers()
    const snapshot = ref(createTestSnapshot())
    snapshot.value.messages = [message('m1', 'assistant', '[地点=英灵殿]')]
    const wrapper = mount(DragonRajaHud, {
      global: {
        provide: { [HUD_CONTEXT_KEY as symbol]: createContext(snapshot) },
        stubs: {
          WelcomeSurface: { template: '<button @click="$emit(\'enter\')">进入</button>' },
          OpeningSurface: { template: '<button @click="$emit(\'cancel\')">跳过</button>' },
        },
      },
      attachTo: document.body,
    })

    await wrapper.get('button').trigger('click')
    await nextTick()
    await wrapper.get('button').trigger('click')
    await nextTick()
    snapshot.value = {
      ...snapshot.value,
      revision: 2,
      messages: [
        message('m1', 'assistant', '[地点=英灵殿]'),
        message('m2', 'user', '[地点=诺顿馆]'),
      ],
    }
    await nextTick()
    expect(wrapper.findAll('.dr-sidebar__status .changed')).toHaveLength(0)

    snapshot.value = {
      ...snapshot.value,
      revision: 3,
      messages: [
        ...snapshot.value.messages,
        message('m3', 'assistant', '[地点=卡塞尔学院][好感度=80]'),
      ],
    }
    await nextTick()
    expect(wrapper.findAll('.dr-sidebar__status .changed')).toHaveLength(4)

    await vi.advanceTimersByTimeAsync(620)
    await nextTick()
    expect(wrapper.findAll('.dr-sidebar__status .changed')).toHaveLength(0)

    wrapper.unmount()
  })
})

describe('Dragon Raja feedback toast', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('uses alert semantics for failures and dismisses after bounded display and leave', async () => {
    vi.useFakeTimers()
    const wrapper = mount(FeedbackToast, { props: { ok: false, message: '原生动作失败' } })
    expect(wrapper.attributes('role')).toBe('alert')

    await vi.advanceTimersByTimeAsync(3240)
    expect(wrapper.emitted('dismiss')).toHaveLength(1)

    wrapper.unmount()
  })

  it('does not emit a stale dismissal after replacement unmount', async () => {
    vi.useFakeTimers()
    const wrapper = mount(FeedbackToast, { props: { ok: true, message: '旧反馈' } })
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(4000)
    expect(wrapper.emitted('dismiss')).toBeUndefined()
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
