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
import { useDerivedDossier, useDerivedStatus } from './useDerivedStatus'

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
const dossier = useDerivedDossier(context.snapshot)
const changedStatusKeys = ref(new Set<string>())
let statusGeneration = 0
/* Right rail is a two-panel surface: the dossier, or the forum reached from its own button. */
const railView = ref<'dossier' | 'forum'>('dossier')
const characterSlot = ref(0)
const optionDraft = ref('')

const activeCharacter = computed(() => dossier.value.characters[characterSlot.value] ?? null)
/* The opening dossier and the action options share one channel into the composer's draft. */
const pendingDraft = computed(() => optionDraft.value || openingDraft.value)

function clearPendingDraft(): void {
  optionDraft.value = ''
  openingDraft.value = ''
}

/* A shrinking cast must not leave the pager pointing past the end of the list. */
watch(() => dossier.value.characters.length, (count) => {
  if (characterSlot.value >= count) characterSlot.value = 0
})

/* The forum panel is meaningless once the assistant stops sending forum markers. */
watch(() => dossier.value.forum, (forum) => {
  if (!forum && railView.value === 'forum') railView.value = 'dossier'
})

/* Attribute rows in display order; blanks are dropped by the template rather than shown empty. */
const characterFields = computed(() => {
  const character = activeCharacter.value
  if (!character) return []
  return [
    { label: '身份', value: character.title },
    { label: '关系', value: character.relation },
    { label: '血统', value: character.blood },
    { label: '言灵', value: character.spirit },
    { label: '装备', value: character.equipment },
    { label: '特质', value: character.trait },
  ]
})

function stepCharacter(delta: number): void {
  const count = dossier.value.characters.length
  if (count < 2) return
  characterSlot.value = (characterSlot.value + delta + count) % count
}

/* Options overwrite the draft rather than appending, and never send on their own. */
function chooseOption(text: string): void {
  optionDraft.value = text
  showMessage(true, '行动文本已写入输入框，确认后发送')
}

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
const generationCopy = computed(() => {
  const status = context.snapshot.value.generation.status
  if (status === 'starting') return { code: 'CALIBRATING', label: '正在建立叙事回路' }
  if (status === 'streaming') return { code: 'WRITING', label: '原生回复正在写入' }
  if (status === 'stopping') return { code: 'STOPPING', label: '正在停止原生生成' }
  if (status === 'error') return { code: 'ERROR', label: '原生生成发生错误' }
  return { code: 'STANDBY', label: '等待下一次行动' }
})

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
        <button class="dr-brand" type="button" aria-label="返回故事" @click="requestSurface('story')">
          <span class="dr-brand__mark" aria-hidden="true"><i /></span>
          <span><strong>卡塞尔学院</strong><small>炼金叙事终端</small></span>
        </button>
        <div class="dr-character"><span class="dr-character__avatar">{{ characterName.slice(0, 1) }}</span><span><strong>{{ characterName }}</strong></span></div>
        <div class="dr-topbar__status" :title="`${connectionLabel} · 快照修订 ${context.snapshot.value.revision}`"><i :class="{ live: context.connection.value.status === 'ready' }" /><b>REV {{ context.snapshot.value.revision }}</b></div>
        <nav class="dr-primary-actions" aria-label="一级功能">
          <button type="button" :disabled="refreshConversationPending || !context.snapshot.value.capabilities.refreshConversation.available" @click="refreshConversation"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" /></svg><strong>{{ refreshConversationPending ? '刷新中' : '刷新对话' }}</strong></button>
          <button type="button" class="dr-primary-actions__compact" @click="openLocalView('codex')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h6a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H5V4Zm14 0h-5v16a3 3 0 0 1 3-3h2V4Z" /></svg><strong>图鉴</strong></button>
          <button type="button" class="dr-primary-actions__compact" @click="openLocalView('map')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Zm5-2v14m6-12v14" /></svg><strong>打开地图</strong></button>
        </nav>
        <button class="dr-menu-trigger" type="button" @click="openLocalView('menu')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14" /></svg><span>更多</span></button>
      </header>
      <div class="dr-shell__rule" />
      <section v-if="mountedSurface === 'story'" class="dr-workspace">
        <div class="dr-story-environment" aria-hidden="true"><div class="dr-story-environment__plate" /><div class="dr-story-environment__mask" /><div class="dr-story-environment__alchemy" /></div>
        <aside class="dr-sidebar" aria-label="故事二级导航">
          <div class="dr-sidebar__crest" aria-hidden="true" />
          <nav>
            <button type="button" class="active" aria-current="page" @click="requestSurface('story')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h9a3 3 0 0 1 3 3v13H8a2 2 0 0 1-2-2V4Zm2 0v14a2 2 0 0 0-2-2h12M10 8h5M10 12h5" /></svg><strong>故事</strong></button>
            <button type="button" @click="openLocalView('status')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 7v5c0 4.2 2.7 7.6 7 9 4.3-1.4 7-4.8 7-9V7l-7-4Zm-3 9 2 2 4-5" /></svg><strong>判读</strong></button>
            <button type="button" @click="openLocalView('map')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Zm5-2v14m6-12v14" /></svg><strong>地图</strong><small>打开地图</small></button>
            <button type="button" @click="openLocalView('codex')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h6a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H5V4Zm14 0h-5v16a3 3 0 0 1 3-3h2V4Z" /></svg><strong>图鉴</strong></button>
            <button type="button" @click="openNative('openConversationPanel')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4V7Zm3-3h10v3H7V4Zm2 7h6m-6 4h4" /></svg><strong>档案</strong></button>
            <button type="button" @click="openLocalView('menu')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14" /></svg><strong>更多</strong></button>
          </nav>
          <button class="dr-sidebar__hide" type="button" @click="hide">原生界面</button>
        </aside>
        <StorySurface :initial-draft="pendingDraft" :edit-pending="editPending" @draft-consumed="clearPendingDraft" @open-models="openNative('openModelSettings')" @edit="edit" @rollback="rollback" @feedback="showMessage" />
        <!-- One continuous panel in three sections: the Native / AI-derived / Theme-local split is
             carried by the section headings and ordering rather than three competing card colours. -->
        <aside class="dr-radar" aria-label="状态栏">
          <section class="dr-status-card dr-status-card--native" aria-labelledby="dr-status-native">
            <header><span id="dr-status-native">原生快照</span><i :class="{ live: context.connection.value.status === 'ready' }" /></header>
            <dl><dt>连接</dt><dd>{{ context.connection.value.status === 'ready' ? '已同步' : '连接中' }}</dd><dt>模型</dt><dd>{{ context.snapshot.value.modelPanel.models.find((model) => model.selected)?.name || '未选择' }}</dd><dt>生成</dt><dd :data-state="context.snapshot.value.generation.status">{{ generationCopy.label }}</dd></dl>
          </section>
          <!-- AI derived, read-only, never written back to the Snapshot. -->
          <section v-if="railView === 'dossier'" class="dr-status-card dr-status-card--derived" aria-labelledby="dr-status-derived">
            <header>
              <span id="dr-status-derived">互动对象</span>
              <span class="dr-dossier__meta">
                <b v-if="dossier.time">{{ dossier.time }}</b>
                <button v-if="dossier.forum" type="button" title="守夜人讨论区" @click="railView = 'forum'">论坛</button>
              </span>
            </header>

            <p v-if="!activeCharacter" class="dr-dossier__empty">暂无助手档案标记</p>
            <div v-else class="dr-dossier">
              <nav v-if="dossier.characters.length > 1" class="dr-dossier__pager">
                <button type="button" aria-label="上一位" @click="stepCharacter(-1)">‹</button>
                <strong>{{ activeCharacter.name }}</strong>
                <button type="button" aria-label="下一位" @click="stepCharacter(1)">›</button>
              </nav>
              <strong v-else class="dr-dossier__name">{{ activeCharacter.name }}</strong>

              <div v-if="activeCharacter.portraitUrl" class="dr-dossier__portrait" :style="{ backgroundImage: `url(${activeCharacter.portraitUrl})` }" role="img" :aria-label="`${activeCharacter.name} 立绘`" />
              <div v-else class="dr-dossier__portrait dr-dossier__portrait--empty" aria-hidden="true" />

              <dl class="dr-dossier__fields">
                <template v-for="field in characterFields" :key="field.label">
                  <dt v-if="field.value">{{ field.label }}</dt>
                  <dd v-if="field.value">{{ field.value }}</dd>
                </template>
              </dl>

              <p v-if="activeCharacter.description" class="dr-dossier__desc">{{ activeCharacter.description }}</p>
              <div v-if="activeCharacter.characterLine" class="dr-dossier__line"><span>{{ activeCharacter.name }}</span><q>{{ activeCharacter.characterLine }}</q></div>
              <div v-if="activeCharacter.playerLine" class="dr-dossier__line dr-dossier__line--player"><span>你</span><q>{{ activeCharacter.playerLine }}</q></div>
              <p v-if="activeCharacter.profile" class="dr-dossier__profile">{{ activeCharacter.profile }}</p>
            </div>

            <div v-if="statuses.length" class="dr-sidebar__status">
              <dl><template v-for="item in statuses" :key="item.key"><dt :class="{ changed: changedStatusKeys.has(item.key) }" :title="item.key">{{ item.key }}</dt><dd :class="{ changed: changedStatusKeys.has(item.key) }" :title="item.value">{{ item.value }}</dd></template></dl>
            </div>

            <!-- Options fill the composer draft and never send by themselves. -->
            <div v-if="dossier.options.length" class="dr-options">
              <span class="dr-options__title">可选行动</span>
              <button v-for="option in dossier.options" :key="option.slot" type="button" @click="chooseOption(option.text)">{{ option.label }}</button>
            </div>

            <small>来自 assistant 文本，只读</small>
          </section>

          <section v-else-if="dossier.forum" class="dr-status-card dr-status-card--derived dr-forum" aria-labelledby="dr-status-forum">
            <header><span id="dr-status-forum">守夜人讨论区</span><button type="button" @click="railView = 'dossier'">返回</button></header>
            <ul v-if="dossier.forum.headlines.length" class="dr-forum__threads"><li v-for="(headline, index) in dossier.forum.headlines" :key="index">{{ headline }}</li></ul>
            <article v-if="dossier.forum.threadBody" class="dr-forum__thread">
              <span v-if="dossier.forum.threadAuthor">{{ dossier.forum.threadAuthor }}</span>
              <p>{{ dossier.forum.threadBody }}</p>
            </article>
            <ul v-if="dossier.forum.replies.length" class="dr-forum__replies"><li v-for="reply in dossier.forum.replies" :key="reply.slot"><span>{{ reply.handle }}</span><p>{{ reply.text }}</p></li></ul>
            <small>来自 assistant 文本，只读</small>
          </section>
        </aside>
      </section>
      <section v-else class="dr-settings"><header><button type="button" @click="requestSurface('story')">← 返回故事</button><div><h1>系统设置</h1><p>原生事实以最新 Snapshot 为准</p></div></header><div class="dr-settings__grid"><button type="button" @click="openNative('openPersona')"><span>人设</span><strong>用户人设</strong><small>称呼、身份与角色视角</small></button><button type="button" @click="openNative('openSupplement')"><span>设定</span><strong>补充设定</strong><small>管理世界注入位置和正文</small></button><button type="button" @click="openNative('openChatSettings')"><span>对话</span><strong>对话设置</strong><small>镜像当前 MMD 对话参数</small></button><button type="button" :disabled="refreshPending" @click="refreshSnapshot"><span>同步</span><strong>{{ refreshPending ? '读取中' : '刷新快照' }}</strong><small>只重新读取原生事实，不触发对话重载</small></button></div></section>
    </section>
    <LocalMenu v-if="localView" :initial-view="localView" :statuses="statuses" @close="localView = null" @settings="handleLocalAction('settings')" @archives="handleLocalAction('archives')" @persona="handleLocalAction('persona')" @supplement="handleLocalAction('supplement')" @exit="handleLocalAction('exit')" />
    <NativePanels @feedback="notify" />
    <FeedbackToast v-if="feedback" :key="feedback.id" :ok="feedback.ok" :message="feedback.message" @dismiss="dismissFeedback(feedback.id)" />
  </main>
</template>
