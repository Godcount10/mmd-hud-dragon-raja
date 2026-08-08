<script setup lang="ts">
import { computed, ref } from 'vue'
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

function trigger(action: MenuAction): void {
  if (action === 'codex' || action === 'map') {
    view.value = action
    if (action === 'codex') emit('codex')
    else emit('map')
  }
  else if (action === 'close') emit('close')
  else if (action === 'settings') emit('settings')
  else if (action === 'archives') emit('archives')
  else if (action === 'persona') emit('persona')
  else if (action === 'supplement') emit('supplement')
  else if (action === 'models') emit('models')
  else if (action === 'refresh') emit('refresh')
  else emit('exit')
}
</script>

<template>
  <section v-if="view === 'menu'" class="dr-menu" role="dialog" aria-modal="true" aria-label="Dragon Raja 菜单">
    <button class="dr-menu__scrim" type="button" aria-label="关闭菜单" @click="emit('close')" />
    <aside class="dr-menu__panel">
      <header><div><span>DRAGON RAJA // SYSTEM</span><h2>导航终端</h2></div><button type="button" aria-label="关闭" @click="emit('close')"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg></button></header>
      <nav><button v-for="(item, index) in menuItems" :key="item.action" type="button" :class="{ danger: item.action === 'exit' }" :disabled="item.action === 'refresh' && refreshPending" @click="trigger(item.action)"><small>{{ String(index + 1).padStart(2, '0') }}</small><span><strong>{{ item.label }}</strong><em>{{ item.detail }}</em></span><b>↗</b></button></nav>
      <footer><span>DERIVED SIGNALS</span><strong>{{ statuses.length }} 条状态已同步</strong></footer>
    </aside>
  </section>
  <section v-else class="dr-local-screen" :aria-label="view === 'codex' ? '图鉴' : '地图'">
    <header><button type="button" @click="view = 'menu'">← 返回导航</button><div><span>LOCAL WORLD DATA</span><h2>{{ view === 'codex' ? '图鉴档案' : '城市节点图' }}</h2></div><button type="button" @click="emit('close')">关闭</button></header>
    <div v-if="view === 'codex'" class="dr-codex-grid"><article v-for="entry in LOCAL_CODEX_PREVIEW" :key="entry.label" :class="{ locked: entry.state !== '已登记' }"><span>{{ entry.kind }}</span><h3>{{ entry.label }}</h3><p>{{ entry.state === '已登记' ? '内置世界条目已准备，后续 AI 标记会继续扩展记录。' : '尚未从叙事中发现该条目。' }}</p><strong>{{ entry.state }}</strong></article></div>
    <div v-else class="dr-map"><div class="dr-map__grid" /><button v-for="node in LOCAL_MAP_PREVIEW" :key="node.label" type="button" class="dr-map__node" :class="{ active: node.active }" :style="{ left: `${node.x}%`, top: `${node.y}%` }"><i /><strong>{{ node.label }}</strong><small>{{ node.note }}</small></button></div>
  </section>
</template>
