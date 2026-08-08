<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useMotionScope } from '../../../shared/motion'
import { LOCAL_CODEX_PREVIEW, LOCAL_MAP_PREVIEW } from '../worldData'
import type { DerivedStatus } from '../types'

const props = withDefaults(defineProps<{ statuses: readonly DerivedStatus[]; refreshPending?: boolean }>(), { refreshPending: false })
type MenuAction = 'close' | 'codex' | 'map' | 'settings' | 'archives' | 'persona' | 'supplement' | 'models' | 'refresh' | 'exit'
const emit = defineEmits<{
  close: []
  settings: []
  archives: []
  persona: []
  supplement: []
  models: []
  refresh: []
  exit: []
  codex: []
  map: []
}>()
const view = ref<'menu' | 'codex' | 'map'>('menu')
const leaving = ref(false)
const root = ref<HTMLElement | null>(null)
const dialog = ref<HTMLElement | null>(null)
const motion = useMotionScope({ root })
let restoreFocus: HTMLElement | null = null

const menuItems = computed(() => [
  { label: '继续叙事', detail: '返回当前故事频道', action: 'close' as const },
  { label: '图鉴档案', detail: '查看 Dragon Raja 内置世界数据', action: 'codex' as const },
  { label: '城市节点图', detail: '查看当前本地地图节点', action: 'map' as const },
  { label: '管理存档', detail: '切换 MMD 原生会话', action: 'archives' as const },
  { label: '用户人设', detail: '调整当前角色视角', action: 'persona' as const },
  { label: '补充设定', detail: '修改世界注入位置', action: 'supplement' as const },
  { label: '模型与参数', detail: '打开模型原生面板', action: 'models' as const },
  { label: '系统设置', detail: 'HUD 和 MMD 设置镜像', action: 'settings' as const },
  { label: props.refreshPending ? '刷新中' : '刷新原生对话', detail: '调用 MMD 原生对话刷新动作', action: 'refresh' as const },
  { label: '退出角色卡', detail: '返回 MMD 上一层界面', action: 'exit' as const },
])

function focusables(): HTMLElement[] {
  if (!dialog.value) return []
  return [...dialog.value.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
}

function animateMenuEntry(): void {
  if (motion.reducedMotion.value) return
  motion.timeline(undefined, (timeline) => {
    timeline
      .fromTo('.dr-menu__scrim', { autoAlpha: 0 }, { autoAlpha: 1, duration: .28, ease: 'power2.out' }, 0)
      .fromTo('.dr-menu__underlay--far', { xPercent: 104 }, { xPercent: 0, duration: .48, ease: 'expo.out' }, .02)
      .fromTo('.dr-menu__underlay--near', { xPercent: 104 }, { xPercent: 0, duration: .52, ease: 'expo.out' }, .06)
      .fromTo('.dr-menu__panel', { xPercent: 104 }, { xPercent: 0, duration: .56, ease: 'expo.out' }, .1)
      .fromTo('.dr-menu__panel nav button', { autoAlpha: 0, x: 22 }, { autoAlpha: 1, x: 0, duration: .32, stagger: .035, ease: 'power2.out' }, .28)
  })
}

onMounted(async () => {
  restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  animateMenuEntry()
  await nextTick()
  focusables()[0]?.focus()
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (restoreFocus?.isConnected) restoreFocus.focus()
})

function closeMenu(): void {
  if (leaving.value) return
  leaving.value = true
  const token = motion.nextGeneration()
  if (motion.reducedMotion.value) {
    emit('close')
    return
  }
  motion.timeline(undefined, (timeline) => {
    timeline
      .to('.dr-menu__panel nav button', { autoAlpha: 0, x: 18, duration: .18, stagger: { each: .018, from: 'end' }, ease: 'power2.in' }, 0)
      .to('.dr-menu__panel', { xPercent: 104, duration: .42, ease: 'power3.in' }, .1)
      .to('.dr-menu__underlay--near', { xPercent: 104, duration: .38, ease: 'power3.in' }, .15)
      .to('.dr-menu__underlay--far', { xPercent: 104, duration: .35, ease: 'power3.in' }, .19)
      .to('.dr-menu__scrim', { autoAlpha: 0, duration: .28, ease: 'power2.in' }, .18)
  })
  void motion.delay(560, token).then((completed) => {
    if (completed && motion.isCurrent(token)) emit('close')
  })
}

async function changeView(nextView: 'menu' | 'codex' | 'map'): Promise<void> {
  if (leaving.value || view.value === nextView) return
  const token = motion.nextGeneration()
  if (!motion.reducedMotion.value) {
    motion.timeline(undefined, (timeline) => {
      timeline.to(dialog.value, { autoAlpha: 0, y: -10, duration: .2, ease: 'power2.in' })
    })
    const left = await motion.delay(200, token)
    if (!left || !motion.isCurrent(token)) return
  }
  view.value = nextView
  await nextTick()
  if (!motion.isCurrent(token)) return
  if (!motion.reducedMotion.value) {
    motion.timeline(undefined, (timeline) => {
      timeline
        .fromTo(dialog.value, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .38, ease: 'expo.out' })
        .fromTo(nextView === 'codex' ? '.dr-codex-grid article' : '.dr-map__node', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .3, stagger: .055, ease: 'power2.out' }, .12)
    })
  }
  focusables()[0]?.focus()
}

function trigger(action: MenuAction): void {
  if (action === 'codex' || action === 'map') {
    void changeView(action)
    if (action === 'codex') emit('codex')
    else emit('map')
  }
  else if (action === 'close') closeMenu()
  else if (action === 'settings') emit('settings')
  else if (action === 'archives') emit('archives')
  else if (action === 'persona') emit('persona')
  else if (action === 'supplement') emit('supplement')
  else if (action === 'models') emit('models')
  else if (action === 'refresh') emit('refresh')
  else emit('exit')
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    if (view.value === 'menu') closeMenu()
    else void changeView('menu')
    return
  }
  if (event.key !== 'Tab') return
  const items = focusables()
  if (!items.length) return
  const first = items[0]!
  const last = items[items.length - 1]!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <section ref="root" class="dr-menu-layer">
    <section v-if="view === 'menu'" ref="dialog" class="dr-menu" role="dialog" aria-modal="true" aria-label="Dragon Raja 菜单">
      <button class="dr-menu__scrim" type="button" aria-label="关闭菜单" @click="closeMenu" />
      <div class="dr-menu__underlay dr-menu__underlay--far" aria-hidden="true" />
      <div class="dr-menu__underlay dr-menu__underlay--near" aria-hidden="true" />
      <aside class="dr-menu__panel">
        <header><div><span>DRAGON RAJA // SYSTEM</span><h2>导航终端</h2></div><button type="button" aria-label="关闭" @click="closeMenu"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg></button></header>
        <nav><button v-for="(item, index) in menuItems" :key="item.action" type="button" :class="{ danger: item.action === 'exit' }" :disabled="leaving || (item.action === 'refresh' && refreshPending)" @click="trigger(item.action)"><small>{{ String(index + 1).padStart(2, '0') }}</small><span><strong>{{ item.label }}</strong><em>{{ item.detail }}</em></span><b>↗</b></button></nav>
        <footer><span>DERIVED SIGNALS</span><strong>{{ statuses.length }} 条状态已同步</strong></footer>
      </aside>
    </section>
    <section v-else ref="dialog" class="dr-local-screen" role="dialog" aria-modal="true" :aria-label="view === 'codex' ? '图鉴' : '地图'">
      <header><button type="button" @click="void changeView('menu')">← 返回导航</button><div><span>LOCAL WORLD DATA</span><h2>{{ view === 'codex' ? '图鉴档案' : '城市节点图' }}</h2></div><button type="button" @click="closeMenu">关闭</button></header>
      <div v-if="view === 'codex'" class="dr-codex-grid"><article v-for="entry in LOCAL_CODEX_PREVIEW" :key="entry.label" :class="{ locked: entry.state !== '已登记' }"><span>{{ entry.kind }}</span><h3>{{ entry.label }}</h3><p>{{ entry.state === '已登记' ? '内置世界条目已准备，后续 AI 标记会继续扩展记录。' : '尚未从叙事中发现该条目。' }}</p><strong>{{ entry.state }}</strong></article></div>
      <div v-else class="dr-map"><div class="dr-map__grid" /><button v-for="node in LOCAL_MAP_PREVIEW" :key="node.label" type="button" class="dr-map__node" :class="{ active: node.active }" :style="{ left: `${node.x}%`, top: `${node.y}%` }"><i /><strong>{{ node.label }}</strong><small>{{ node.note }}</small></button></div>
    </section>
  </section>
</template>
