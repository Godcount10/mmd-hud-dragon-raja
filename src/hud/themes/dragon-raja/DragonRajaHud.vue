<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useMotionScope } from '../../shared/motion'
import type { ActionResult } from '../../../contracts'
import { useHudContext } from '../../context'
import OpeningSurface from './components/OpeningSurface.vue'
import StorySurface from './components/StorySurface.vue'
import WelcomeSurface from './components/WelcomeSurface.vue'
import FeedbackToast from './components/FeedbackToast.vue'
import LocalMenu, { type LocalView } from './components/LocalMenu.vue'
import NativePanels from './components/NativePanels.vue'
import { useDerivedStatus } from './useDerivedStatus'

type Surface = 'welcome' | 'opening' | 'story' | 'settings'
const context = useHudContext()
const surface = ref<Surface>('welcome')
const mountedSurface = ref<Surface>('welcome')
const surfaceChanging = ref(false)
const shellRoot = ref<HTMLElement | null>(null)
const shellMotion = useMotionScope({ root: shellRoot })
const localView = ref<LocalView | null>(null)
const feedback = ref<{ id: number; ok: boolean; message: string } | null>(null)
let feedbackId = 0
const openingDraft = ref('')
const refreshPending = ref(false)
const refreshConversationPending = ref(false)
const editPending = ref(false)
const statuses = useDerivedStatus(context.snapshot)
const changedStatusKeys = ref(new Set<string>())
let statusGeneration = 0

watch(statuses, (nextStatuses, previousStatuses) => {
  const previous = new Map(previousStatuses?.map((item) => [item.key, item.value]) ?? [])
  const changed = nextStatuses.filter((item) => previous.get(item.key) !== item.value).map((item) => item.key)
  if (!changed.length) return
  statusGeneration += 1
  const token = statusGeneration
  changedStatusKeys.value = new Set(changed)
  void shellMotion.delay(620).then((completed) => {
    if (completed && token === statusGeneration) changedStatusKeys.value = new Set()
  })
})

const characterName = computed(() => context.snapshot.value.character.name || '未知角色')
const connectionLabel = computed(() => context.connection.value.status === 'ready' ? 'FRAME ONLINE' : context.connection.value.status.toUpperCase())

function showMessage(ok: boolean, message: string): void {
  feedbackId += 1
  feedback.value = { id: feedbackId, ok, message }
}

function notify(result: ActionResult): void {
  showMessage(result.ok, result.ok ? '动作已提交，等待最新快照' : result.error?.message || '原生动作失败')
}

function dismissFeedback(id: number): void {
  if (feedback.value?.id === id) feedback.value = null
}

function requestSurface(nextSurface: Surface): void {
  if (nextSurface === surface.value || shellMotion.disposed.value) return
  surface.value = nextSurface
  if (mountedSurface.value === 'welcome' || mountedSurface.value === 'opening') {
    mountedSurface.value = nextSurface
    return
  }
  void transitionSurface(nextSurface)
}

async function transitionSurface(nextSurface: Surface): Promise<void> {
  const token = shellMotion.nextGeneration()
  surfaceChanging.value = true
  const current = shellRoot.value
  if (current && !shellMotion.reducedMotion.value) {
    shellMotion.timeline(undefined, (timeline) => {
      timeline.to(current, { autoAlpha: 0, y: nextSurface === 'settings' ? -12 : 12, duration: .28, ease: 'power2.in' })
    })
    const completed = await shellMotion.delay(280, token)
    if (!completed || !shellMotion.isCurrent(token)) return
  }
  mountedSurface.value = nextSurface
  await nextTick()
  if (!shellMotion.isCurrent(token)) return
  if (current && !shellMotion.reducedMotion.value) {
    shellMotion.timeline(undefined, (timeline) => {
      timeline.fromTo(current, { autoAlpha: 0, y: nextSurface === 'settings' ? 12 : -12 }, { autoAlpha: 1, y: 0, duration: .52, ease: 'expo.out' })
    })
  }
  surfaceChanging.value = false
}

function enterStory(): void {
  openingDraft.value = ''
  requestSurface('story')
}

function completeOpening(draft: string): void {
  openingDraft.value = draft
  requestSurface('story')
  showMessage(true, '开局档案已写入输入框，请确认后发送')
}

async function openNative(action: 'openModelSettings' | 'openConversationPanel' | 'openPersona' | 'openSupplement' | 'openChatSettings'): Promise<void> {
  const result = await context.invoke(action)
  notify(result)
}

async function refreshSnapshot(): Promise<void> {
  if (refreshPending.value) return
  refreshPending.value = true
  try {
    await context.refresh()
    showMessage(true, '已读取最新原生快照')
  } catch (error) {
    showMessage(false, error instanceof Error ? error.message : '读取原生快照失败')
  } finally {
    refreshPending.value = false
  }
}

async function refreshConversation(): Promise<void> {
  if (refreshConversationPending.value) return
  refreshConversationPending.value = true
  try {
    notify(await context.invoke('refreshConversation'))
  } finally {
    refreshConversationPending.value = false
  }
}

async function exit(): Promise<void> {
  const result = await context.invoke('exit')
  notify(result)
}

async function hide(): Promise<void> {
  await context.hideHud()
}

type LocalAction = 'archives' | 'persona' | 'supplement' | 'settings' | 'exit'

function openLocalView(view: LocalView): void {
  if (localView.value) return
  localView.value = view
}

function handleLocalAction(action: LocalAction): void {
  localView.value = null
  if (action === 'archives') void openNative('openConversationPanel')
  else if (action === 'persona') void openNative('openPersona')
  else if (action === 'supplement') void openNative('openSupplement')
  else if (action === 'settings') requestSurface('settings')
  else void exit()
}

async function rollback(messageId: string): Promise<void> {
  const result = await context.invoke('rollbackMessage', { messageId })
  notify(result)
}

async function edit(messageId: string): Promise<void> {
  if (editPending.value) return
  editPending.value = true
  try {
    const result = await context.invoke('openEditMessage', { messageId })
    notify(result)
  } finally {
    editPending.value = false
  }
}

</script>

<template>
  <main class="dragon-raja-hud">
    <!--
    THESIS: Dragon Raja 不是一层覆盖在聊天上的皮肤，而是一份正在被解密的学院档案；拒绝普通工具栏和卡片堆叠。
    OWN-WORLD: 深夜蓝黑、青铜金、冰青和龙焰橙组成档案终端；锐利刻线、坐标标记、扫描线与稀疏节点取代霓虹玻璃。
    STORY: 访客拆开录取通知，完成新生档案，再在对话中行动；原生面板只以明确的镜像入口出现，AI 状态只读展示。
    FIRST VIEWPORT: 欢迎界面以巨大的学院封印占据中心，录取文案和“拆开信封”位于下方；进入后故事消息是主舞台，状态与导航固定在边缘。
    FORM: 档案终端 / 全屏操作界面；独立 Dragon Raja 迁移实现，保留旧 game 的 GSAP 过渡经验但不复制旧数据。
    FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
    -->
    <WelcomeSurface v-if="mountedSurface === 'welcome'" @enter="requestSurface('opening')" />
    <OpeningSurface v-else-if="mountedSurface === 'opening'" @complete="completeOpening" @cancel="enterStory" />
    <section v-else class="dr-shell" ref="shellRoot" :aria-busy="surfaceChanging">
      <header class="dr-topbar">
        <button class="dr-brand" type="button" aria-label="返回故事" @click="requestSurface('story')"><span class="dr-brand__mark">DR</span><span><strong>Dragon Raja</strong><small>ACADEMY ARCHIVE</small></span></button>
        <div class="dr-character"><span class="dr-character__avatar">{{ characterName.slice(0, 1) }}</span><span><small>当前叙事对象</small><strong>{{ characterName }}</strong></span></div>
        <div class="dr-topbar__status"><i :class="{ live: context.connection.value.status === 'ready' }" /><span>{{ connectionLabel }}</span><b>REV {{ context.snapshot.value.revision }}</b></div>
        <nav class="dr-primary-actions" aria-label="一级功能">
          <button type="button" :disabled="refreshConversationPending || !context.snapshot.value.capabilities.refreshConversation.available" @click="refreshConversation"><span>同步</span><strong>{{ refreshConversationPending ? '刷新中' : '刷新对话' }}</strong></button>
          <button type="button" class="dr-primary-actions__compact" @click="openLocalView('codex')"><span>资料</span><strong>图鉴</strong></button>
          <button type="button" class="dr-primary-actions__compact" @click="openLocalView('map')"><span>坐标</span><strong>地图</strong></button>
        </nav>
        <button class="dr-menu-trigger" type="button" @click="openLocalView('menu')"><i /><i /><span>更多</span></button>
      </header>
      <div class="dr-shell__rule" />
      <section v-if="mountedSurface === 'story'" class="dr-workspace">
        <aside class="dr-sidebar">
          <div><span>WORLD SIGNAL</span><h2>正在发生</h2></div>
          <div class="dr-sidebar__status"><small>AI DERIVED STATUS</small><p v-if="!statuses.length">等待叙事标记……</p><dl v-else><template v-for="item in statuses" :key="item.key"><dt :class="{ changed: changedStatusKeys.has(item.key) }">{{ item.key }}</dt><dd :class="{ changed: changedStatusKeys.has(item.key) }">{{ item.value }}</dd></template></dl></div>
          <nav><button type="button" @click="openLocalView('menu')"><span>档案与设置</span><strong>更多</strong></button><button type="button" @click="openLocalView('codex')"><span>本地世界资料</span><strong>图鉴 ↗</strong></button></nav>
          <button class="dr-sidebar__hide" type="button" @click="hide">查看原生界面</button>
        </aside>
        <StorySurface :initial-draft="openingDraft" :edit-pending="editPending" @draft-consumed="openingDraft = ''" @open-models="openNative('openModelSettings')" @edit="edit" @rollback="rollback" @feedback="showMessage" />
        <aside class="dr-radar"><div class="dr-radar__sweep" /><span class="dr-radar__label">LOCAL MAP / CURRENT NODE</span><div class="dr-radar__circle"><i /><i /><i /><b>英灵殿</b></div><button type="button" @click="openLocalView('map')">打开地图 <span>↗</span></button><div class="dr-radar__footer"><span>生成状态</span><strong>{{ context.snapshot.value.generation.status }}</strong></div></aside>
      </section>
      <section v-else class="dr-settings"><header><button type="button" @click="requestSurface('story')">← 返回故事</button><div><span>HUD CONTROL / NATIVE MIRROR</span><h1>系统设置</h1></div></header><div class="dr-settings__grid"><button type="button" @click="openNative('openPersona')"><span>01</span><strong>用户人设</strong><small>称呼、身份与角色视角</small></button><button type="button" @click="openNative('openSupplement')"><span>02</span><strong>补充设定</strong><small>管理世界注入位置和正文</small></button><button type="button" @click="openNative('openChatSettings')"><span>03</span><strong>对话设置</strong><small>镜像当前 MMD 对话参数</small></button><button type="button" :disabled="refreshPending" @click="refreshSnapshot"><span>04</span><strong>{{ refreshPending ? '读取中' : '刷新快照' }}</strong><small>只重新读取原生事实，不触发对话重载</small></button></div></section>
    </section>
    <LocalMenu v-if="localView" :initial-view="localView" :statuses="statuses" @close="localView = null" @settings="handleLocalAction('settings')" @archives="handleLocalAction('archives')" @persona="handleLocalAction('persona')" @supplement="handleLocalAction('supplement')" @exit="handleLocalAction('exit')" />
    <NativePanels @feedback="notify" />
    <FeedbackToast v-if="feedback" :key="feedback.id" :ok="feedback.ok" :message="feedback.message" @dismiss="dismissFeedback(feedback.id)" />
  </main>
</template>
