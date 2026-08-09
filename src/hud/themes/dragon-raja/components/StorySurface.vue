<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { ChatMessage } from '../../../../contracts'
import { useHudContext } from '../../../context'
import { useMotionScope } from '../../../shared/motion'
import { sanitizeMessageHtml } from '../sanitizeMessageHtml'

const props = withDefaults(defineProps<{ initialDraft?: string; editPending?: boolean }>(), { initialDraft: '', editPending: false })
const emit = defineEmits<{
  openModels: []
  edit: [messageId: string]
  rollback: [messageId: string]
  feedback: [ok: boolean, message: string]
  draftConsumed: []
}>()
const { snapshot, invoke } = useHudContext()
const draft = ref('')
const sending = ref(false)
const root = ref<HTMLElement | null>(null)
const list = ref<HTMLElement | null>(null)
const motion = useMotionScope({ root })
const sanitizedCache = new Map<string, { source: string; output: string }>()
const seenMessageIds = new Set<string>()
const completedMessageIds = new Set<string>()
const freshMessageIds = ref(new Set<string>())
const historyReplacing = ref(false)
let freshGeneration = 0
let historyGeneration = 0
let seeded = false

const currentModel = computed(() => snapshot.value.modelPanel.models.find((model) => model.selected)?.name || '选择模型')

function html(message: ChatMessage): string {
  const source = message.html || message.text
  const cached = sanitizedCache.get(message.id)
  if (cached?.source === source) return cached.output
  const output = sanitizeMessageHtml(source)
  sanitizedCache.set(message.id, { source, output })
  return output
}

async function send(): Promise<void> {
  const text = draft.value.trim()
  if (!text || sending.value || !snapshot.value.capabilities.sendMessage.available) return
  sending.value = true
  try {
    const result = await invoke('sendMessage', { text })
    emit('feedback', result.ok, result.ok ? '行动已送入叙事频道' : result.error?.message || '消息发送失败')
    if (result.ok) draft.value = ''
  } finally {
    sending.value = false
  }
}

function editMessage(messageId: string): void {
  if (props.editPending) return
  emit('edit', messageId)
}

function nearBottom(): boolean {
  const node = list.value
  return !node || node.scrollHeight - node.scrollTop - node.clientHeight < 120
}

function messageSelector(id: string): string {
  const escaped = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(id)
    : id.replace(/["\\]/g, '\\$&')
  return `[data-message-id="${escaped}"]`
}

function scrollToBottom(behavior: ScrollBehavior): void {
  const node = list.value
  if (!node) return
  if (typeof node.scrollTo === 'function') node.scrollTo({ top: node.scrollHeight, behavior })
  else node.scrollTop = node.scrollHeight
}

function animateNewMessages(messages: readonly ChatMessage[], ids: readonly string[]): void {
  if (motion.reducedMotion.value || !ids.length) return
  motion.timeline(undefined, (timeline) => {
    ids.forEach((id, index) => {
      const message = messages.find((candidate) => candidate.id === id)
      const target = list.value?.querySelector<HTMLElement>(messageSelector(id))
      if (!message || !target) return
      const x = message.role === 'user' ? 28 : -28
      const at = index * .08
      timeline
        .fromTo(target, { autoAlpha: 0, x, clipPath: 'inset(0 0 100% 0)' }, { autoAlpha: 1, x: 0, clipPath: 'inset(0)', duration: .48, ease: 'expo.out' }, at)
        .fromTo(target.querySelectorAll('header, .dr-message__body, footer'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: .3, stagger: .04, ease: 'power2.out' }, at + .14)
    })
  })
}

function animateHistoryReplacement(): void {
  const node = list.value
  if (!node || motion.reducedMotion.value) return
  motion.timeline(undefined, (timeline) => {
    timeline.fromTo(node, { autoAlpha: .72, y: 8 }, { autoAlpha: 1, y: 0, duration: .32, ease: 'power2.out' })
  })
}

watch(() => props.initialDraft, (value) => {
  if (!value) return
  draft.value = value
  emit('draftConsumed')
}, { immediate: true })

watch(() => snapshot.value.messages, async (messages, previousMessages) => {
  sanitizedCache.forEach((_value, id) => {
    if (!messages.some((message) => message.id === id)) sanitizedCache.delete(id)
  })
  const previousIds = new Set(previousMessages?.map((message) => message.id) ?? [])
  const nextIds = new Set(messages.map((message) => message.id))
  const replacedHistory = seeded
    && previousIds.size > 0
    && nextIds.size > 0
    && snapshot.value.generation.status === 'idle'
    && ![...nextIds].some((id) => previousIds.has(id))

  if (replacedHistory) {
    seenMessageIds.clear()
    completedMessageIds.clear()
    messages.forEach((message) => seenMessageIds.add(message.id))
    freshGeneration += 1
    freshMessageIds.value = new Set()
    historyGeneration += 1
    const token = historyGeneration
    historyReplacing.value = true
    await nextTick()
    if (token !== historyGeneration || motion.disposed.value) return
    animateHistoryReplacement()
    scrollToBottom('auto')
    void motion.delay(360).then((completed) => {
      if (completed && token === historyGeneration) historyReplacing.value = false
    })
    return
  }

  for (const id of seenMessageIds) {
    if (!nextIds.has(id)) {
      seenMessageIds.delete(id)
      completedMessageIds.delete(id)
    }
  }
  if (!seeded) {
    messages.forEach((message) => seenMessageIds.add(message.id))
    seeded = true
    await nextTick()
    scrollToBottom('auto')
    return
  }

  const added = messages.filter((message) => !seenMessageIds.has(message.id)).map((message) => message.id)
  added.forEach((id) => seenMessageIds.add(id))
  freshMessageIds.value = new Set(added)
  const shouldFollow = nearBottom()
  await nextTick()
  animateNewMessages(messages, added)
  if (added.length) {
    freshGeneration += 1
    const token = freshGeneration
    void motion.delay(620).then((completed) => {
      if (completed && token === freshGeneration) freshMessageIds.value = new Set()
    })
  }
  if (shouldFollow) scrollToBottom(motion.reducedMotion.value ? 'auto' : 'smooth')
}, { immediate: true })

watch(() => snapshot.value.generation, async (generation, previous) => {
  if (!previous || previous.status === 'idle' || generation.status !== 'idle' || !previous.messageId) return
  if (completedMessageIds.has(previous.messageId)) return
  completedMessageIds.add(previous.messageId)
  await nextTick()
  if (motion.reducedMotion.value) return
  const target = list.value?.querySelector<HTMLElement>(messageSelector(previous.messageId))
  if (!target) return
  motion.timeline(undefined, (timeline) => {
    timeline
      .fromTo(target, { filter: 'brightness(1.45)' }, { filter: 'brightness(1)', duration: .42, ease: 'power2.out' })
      .fromTo(target.querySelector('.dr-message__body'), { x: -5 }, { x: 0, duration: .3, ease: 'power2.out' }, 0)
  })
})
</script>

<template>
  <section ref="root" class="dr-story" aria-label="Dragon Raja 对话频道">
    <header class="dr-story__header">
      <div>
        <h1>{{ snapshot.character.name || '未知角色' }}</h1>
        <p>{{ snapshot.generation.status === 'idle' ? '线路已加密，等待下一次行动' : '言灵回路正在生成新的叙事' }}</p>
      </div>
      <span class="dr-story__signal" :data-state="snapshot.connection.status"><i />{{ snapshot.connection.status === 'connected' ? '在线' : '重连中' }}</span>
    </header>

    <div ref="list" class="dr-story__messages" :class="{ 'dr-story__messages--replacing': historyReplacing }" aria-live="polite">
      <div v-if="!snapshot.messages.length" class="dr-story__empty"><strong>频道静默</strong><span>第一条角色消息抵达后，叙事会在这里展开。</span></div>
      <article v-for="message in snapshot.messages" :key="message.id" class="dr-message" :class="[`dr-message--${message.role}`, { 'dr-message--fresh': freshMessageIds.has(message.id) }]" :data-message-id="message.id">
        <header><span>{{ message.role === 'assistant' ? snapshot.character.name : message.role === 'user' ? '你' : '系统记录' }}</span><time>{{ String(message.index + 1).padStart(3, '0') }}</time></header>
        <div class="dr-message__body" v-html="html(message)" />
        <footer v-if="message.capabilities.edit || message.capabilities.rollback">
          <button v-if="message.capabilities.edit" type="button" :disabled="editPending || !snapshot.capabilities.openEditMessage.available" @click="editMessage(message.id)">编辑</button>
          <button v-if="message.capabilities.rollback" type="button" :disabled="editPending || !snapshot.capabilities.rollbackMessage.available" @click="emit('rollback', message.id)">回溯</button>
        </footer>
      </article>
    </div>

    <form class="dr-composer" @submit.prevent="send">
      <button type="button" class="dr-composer__model" :disabled="!snapshot.capabilities.openModelSettings.available" @click="emit('openModels')"><span>模型</span><strong>{{ currentModel }}</strong></button>
      <label><span class="dr-visually-hidden">输入行动</span><textarea v-model="draft" maxlength="2000" rows="1" placeholder="输入你的行动或回复……" @keydown.ctrl.enter.prevent="send" /></label>
      <button type="submit" class="dr-composer__send" :disabled="sending || !draft.trim() || !snapshot.capabilities.sendMessage.available"><span>{{ sending ? '同步中' : '发送' }}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M8 5h11v11" /></svg></button>
    </form>
  </section>
</template>
