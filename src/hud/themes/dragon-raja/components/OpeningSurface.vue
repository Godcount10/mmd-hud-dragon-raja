<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useMotionScope } from '../../../shared/motion'
import { OPENING_GROUPS } from '../worldData'
import type { OpeningSelection } from '../types'

const emit = defineEmits<{ complete: [draft: string]; cancel: [] }>()
const selected = ref<Record<string, string>>({})
const activeGroup = ref(0)
const transitioning = ref(false)
const root = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
const motion = useMotionScope({ root })

const group = computed(() => OPENING_GROUPS[activeGroup.value]!)
const selections = computed<OpeningSelection[]>(() => OPENING_GROUPS.flatMap((item) => {
  const option = selected.value[item.id]
  return option ? [{ groupId: item.id, groupTitle: item.title, option }] : []
}))
const complete = computed(() => selections.value.length === OPENING_GROUPS.length)

function animateEntry(): void {
  if (motion.reducedMotion.value) return
  motion.timeline(undefined, (timeline) => {
    timeline
      .fromTo('.dr-opening__top', { autoAlpha: 0, y: -18 }, { autoAlpha: 1, y: 0, duration: .42, ease: 'power3.out' }, 0)
      .fromTo('.dr-opening__steps button', { autoAlpha: 0, x: -18 }, { autoAlpha: 1, x: 0, duration: .34, stagger: .055, ease: 'power2.out' }, .1)
      .fromTo('.dr-opening__content > *', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: .42, stagger: .07, ease: 'power3.out' }, .2)
      .fromTo('.dr-opening__record > *', { autoAlpha: 0, x: 18 }, { autoAlpha: 1, x: 0, duration: .4, stagger: .07, ease: 'power2.out' }, .28)
  })
}

async function goToGroup(nextGroup: number): Promise<void> {
  if (transitioning.value || nextGroup === activeGroup.value || nextGroup < 0 || nextGroup >= OPENING_GROUPS.length) return
  const previousGroup = activeGroup.value
  transitioning.value = true
  const token = motion.nextGeneration()
  const node = content.value
  if (node && !motion.reducedMotion.value) {
    motion.timeline(undefined, (timeline) => {
      timeline.to(node, { autoAlpha: 0, x: nextGroup > previousGroup ? -24 : 24, duration: .2, ease: 'power2.in' })
    })
    const left = await motion.delay(200, token)
    if (!left || !motion.isCurrent(token)) {
      transitioning.value = false
      return
    }
  }

  activeGroup.value = nextGroup
  await nextTick()
  if (!motion.isCurrent(token)) {
    transitioning.value = false
    return
  }
  if (node && !motion.reducedMotion.value) {
    motion.timeline(undefined, (timeline) => {
      timeline.fromTo(node, { autoAlpha: 0, x: nextGroup > previousGroup ? 26 : -26 }, { autoAlpha: 1, x: 0, duration: .42, ease: 'expo.out' })
    })
  }
  transitioning.value = false
}

async function select(option: string): Promise<void> {
  if (transitioning.value) return
  selected.value = { ...selected.value, [group.value.id]: option }
  if (activeGroup.value < OPENING_GROUPS.length - 1) {
    await goToGroup(activeGroup.value + 1)
  }
}

function submit(): void {
  if (!complete.value || transitioning.value) return
  const text = selections.value.map((item) => `${item.groupTitle}：${item.option}`).join('；')
  const token = motion.nextGeneration()
  if (motion.reducedMotion.value) {
    emit('complete', `我的 Dragon Raja 开局档案：${text}。请根据这份档案开始故事。`)
    return
  }
  transitioning.value = true
  motion.timeline(undefined, (timeline) => {
    timeline
      .to('.dr-opening__record', { autoAlpha: .55, duration: .18, ease: 'power2.in' })
      .to('.dr-opening__record button', { scale: .97, duration: .12, yoyo: true, repeat: 1, ease: 'power2.inOut' })
  })

  void motion.delay(420, token).then((completed) => {
    if (!completed || !motion.isCurrent(token)) return
    transitioning.value = false
    emit('complete', `我的 Dragon Raja 开局档案：${text}。请根据这份档案开始故事。`)
  })
}

onMounted(animateEntry)
onBeforeUnmount(() => motion.kill())
</script>

<template>
  <section ref="root" class="dr-opening" role="dialog" aria-modal="true" aria-label="开局档案">
    <div class="dr-opening__storm" aria-hidden="true"><i /><i /><i /></div>
    <header class="dr-opening__top">
      <div><strong>卡塞尔学院</strong><span>新生档案终端</span></div>
      <button type="button" aria-label="暂不开局" :disabled="transitioning" @click="emit('cancel')"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
    </header>
    <nav class="dr-opening__steps" aria-label="开局步骤">
      <button v-for="(item, index) in OPENING_GROUPS" :key="item.id" type="button" :class="{ active: index === activeGroup, done: Boolean(selected[item.id]) }" :disabled="transitioning" @click="void goToGroup(index)"><span>{{ index + 1 }}</span>{{ item.title }}</button>
    </nav>
    <main ref="content" class="dr-opening__content">
      <div class="dr-opening__counter"><span>{{ String(activeGroup + 1).padStart(2, '0') }}</span><i />{{ String(OPENING_GROUPS.length).padStart(2, '0') }}</div>
      <h1>{{ group.title }}</h1>
      <p>{{ group.instruction }}</p>
      <div class="dr-opening__choices">
        <button v-for="option in group.options" :key="option" type="button" :class="{ selected: selected[group.id] === option }" :disabled="transitioning" @click="void select(option)"><span>{{ option }}</span><svg viewBox="0 0 32 32" aria-hidden="true"><path d="m6 17 7 7L27 8" /></svg></button>
      </div>
    </main>
    <aside class="dr-opening__record">
      <h2>你的档案</h2>
      <ol><li v-for="item in selections" :key="item.groupId"><small>{{ item.groupTitle }}</small><strong>{{ item.option }}</strong></li></ol>
      <button type="button" :disabled="!complete || transitioning" @click="submit">{{ complete ? '确认档案，进入叙事' : `还需完成 ${OPENING_GROUPS.length - selections.length} 项` }}</button>
    </aside>
  </section>
</template>
