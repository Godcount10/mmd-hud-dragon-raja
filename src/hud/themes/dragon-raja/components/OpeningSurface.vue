<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { gsap } from 'gsap'
import { OPENING_GROUPS } from '../worldData'
import type { OpeningSelection } from '../types'

const emit = defineEmits<{ complete: [draft: string]; cancel: [] }>()
const selected = ref<Record<string, string>>({})
const activeGroup = ref(0)
const root = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
let transition: gsap.core.Timeline | null = null

const group = computed(() => OPENING_GROUPS[activeGroup.value]!)
const selections = computed<OpeningSelection[]>(() => OPENING_GROUPS.flatMap((item) => {
  const option = selected.value[item.id]
  return option ? [{ groupId: item.id, groupTitle: item.title, option }] : []
}))
const complete = computed(() => selections.value.length === OPENING_GROUPS.length)

async function select(option: string): Promise<void> {
  selected.value = { ...selected.value, [group.value.id]: option }
  if (activeGroup.value >= OPENING_GROUPS.length - 1) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduce && content.value) {
    transition?.kill()
    transition = gsap.timeline().to(content.value, { autoAlpha: 0, x: -24, duration: .2, ease: 'power2.in' })
  }
  await new Promise((resolve) => window.setTimeout(resolve, reduce ? 0 : 220))
  activeGroup.value += 1
  await nextTick()
  if (!reduce && content.value) transition = gsap.timeline().fromTo(content.value, { autoAlpha: 0, x: 26 }, { autoAlpha: 1, x: 0, duration: .42, ease: 'expo.out' })
}

function submit(): void {
  if (!complete.value) return
  const text = selections.value.map((item) => `${item.groupTitle}：${item.option}`).join('；')
  emit('complete', `我的 Dragon Raja 开局档案：${text}。请根据这份档案开始故事。`)
}

onBeforeUnmount(() => transition?.kill())
</script>

<template>
  <section ref="root" class="dr-opening" role="dialog" aria-modal="true" aria-label="开局档案">
    <div class="dr-opening__storm" aria-hidden="true"><i /><i /><i /></div>
    <header class="dr-opening__top">
      <div><strong>卡塞尔学院</strong><span>新生档案终端</span></div>
      <button type="button" aria-label="暂不开局" @click="emit('cancel')"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
    </header>
    <nav class="dr-opening__steps" aria-label="开局步骤">
      <button v-for="(item, index) in OPENING_GROUPS" :key="item.id" type="button" :class="{ active: index === activeGroup, done: Boolean(selected[item.id]) }" @click="activeGroup = index"><span>{{ index + 1 }}</span>{{ item.title }}</button>
    </nav>
    <main ref="content" class="dr-opening__content">
      <div class="dr-opening__counter"><span>{{ String(activeGroup + 1).padStart(2, '0') }}</span><i />{{ String(OPENING_GROUPS.length).padStart(2, '0') }}</div>
      <h1>{{ group.title }}</h1>
      <p>{{ group.instruction }}</p>
      <div class="dr-opening__choices">
        <button v-for="option in group.options" :key="option" type="button" :class="{ selected: selected[group.id] === option }" @click="select(option)"><span>{{ option }}</span><svg viewBox="0 0 32 32" aria-hidden="true"><path d="m6 17 7 7L27 8" /></svg></button>
      </div>
    </main>
    <aside class="dr-opening__record">
      <h2>你的档案</h2>
      <ol><li v-for="item in selections" :key="item.groupId"><small>{{ item.groupTitle }}</small><strong>{{ item.option }}</strong></li></ol>
      <button type="button" :disabled="!complete" @click="submit">{{ complete ? '确认档案，进入叙事' : `还需完成 ${OPENING_GROUPS.length - selections.length} 项` }}</button>
    </aside>
  </section>
</template>
