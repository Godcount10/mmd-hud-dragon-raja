<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { gsap } from 'gsap'
import type { ChatMessage } from '../../../../contracts'
import { useHudContext } from '../../../context'
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
const list = ref<HTMLElement | null>(null)
const sanitizedCache = new Map<string, { source: string; output: string }>()
let entrance: gsap.core.Timeline | null = null

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

watch(() => props.initialDraft, (value) => {
  if (!value) return
  draft.value = value
  emit('draftConsumed')
}, { immediate: true })

watch(() => snapshot.value.messages, async (messages, previous) => {
  sanitizedCache.forEach((_value, id) => {
    if (!messages.some((message) => message.id === id)) sanitizedCache.delete(id)
  })
  const appended = previous && messages.length > previous.length
  const nearBottom = !list.value || list.value.scrollHeight - list.value.scrollTop - list.value.clientHeight < 120
  await nextTick()
  if (appended && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    entrance?.kill()
    const nodes = list.value?.querySelectorAll<HTMLElement>('.dr-message')
    const target = nodes?.[nodes.length - 1]
    if (target) entrance = gsap.timeline().fromTo(target, { autoAlpha: 0, y: 22, clipPath: 'inset(0 0 100% 0)' }, { autoAlpha: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: .52, ease: 'expo.out' })
  }
  if (!previous || nearBottom) list.value?.scrollTo({ top: list.value.scrollHeight, behavior: previous ? 'smooth' : 'auto' })
}, { immediate: true })

onBeforeUnmount(() => entrance?.kill())
</script>

<template>
  <section class="dr-story" aria-label="Dragon Raja 对话频道">
    <header class="dr-story__header">
      <div>
        <h1>{{ snapshot.character.name || '未知角色' }}</h1>
        <p>{{ snapshot.generation.status === 'idle' ? '线路已加密，等待下一次行动' : '言灵回路正在生成新的叙事' }}</p>
      </div>
      <span class="dr-story__signal" :data-state="snapshot.connection.status"><i />{{ snapshot.connection.status === 'connected' ? '在线' : '重连中' }}</span>
    </header>

    <div ref="list" class="dr-story__messages" aria-live="polite">
      <div v-if="!snapshot.messages.length" class="dr-story__empty"><strong>频道静默</strong><span>第一条角色消息抵达后，叙事会在这里展开。</span></div>
      <article v-for="message in snapshot.messages" :key="message.id" class="dr-message" :class="`dr-message--${message.role}`">
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
