<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useMotionScope } from '../../../shared/motion'
import { DRAGON_RAJA_MEDIA } from '../media'
import { OPENING_GROUPS } from '../worldData'
import type { OpeningChoiceGroup, OpeningSelection } from '../types'

const props = withDefaults(defineProps<{
  groups?: readonly OpeningChoiceGroup[]
}>(), {
  groups: () => OPENING_GROUPS,
})
const emit = defineEmits<{ complete: [draft: string]; cancel: [] }>()
const selected = ref<Record<string, readonly string[]>>({})
const activeGroup = ref(0)
const transitioning = ref(false)
const root = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
const motion = useMotionScope({ root })

const groups = computed(() => props.groups)
const group = computed(() => groups.value[activeGroup.value]!)
const selectedOptions = computed(() => selected.value[group.value.id] ?? [])
const multiple = computed(() => group.value.selectionMode === 'multiple')
const minimum = computed(() => minimumSelections(group.value))
const maximum = computed(() => maximumSelections(group.value))
const denseChoices = computed(() => group.value.options.length > 6)
const extensiveChoices = computed(() => group.value.options.length > 12)
const selections = computed<OpeningSelection[]>(() => groups.value.flatMap((item) => {
  const options = selected.value[item.id] ?? []
  return options.length ? [{ groupId: item.id, groupTitle: item.title, option: options.join('、') }] : []
}))
const completedGroups = computed(() => groups.value.filter(isGroupComplete).length)
const complete = computed(() => completedGroups.value === groups.value.length)
const remaining = computed(() => groups.value.length - completedGroups.value)
const progressStyle = computed(() => ({
  '--dr-opening-progress-scale': String(groups.value.length ? completedGroups.value / groups.value.length : 0),
  '--dr-opening-step-count': String(Math.max(groups.value.length, 1)),
}))

function minimumSelections(item: OpeningChoiceGroup): number {
  if (item.selectionMode !== 'multiple') return 1
  return Math.min(item.options.length, Math.max(1, item.minSelections ?? 1))
}

function maximumSelections(item: OpeningChoiceGroup): number {
  if (item.selectionMode !== 'multiple') return 1
  return Math.min(item.options.length, Math.max(minimumSelections(item), item.maxSelections ?? item.options.length))
}

function groupOptions(item: OpeningChoiceGroup): readonly string[] {
  return selected.value[item.id] ?? []
}

function isGroupComplete(item: OpeningChoiceGroup): boolean {
  return groupOptions(item).length >= minimumSelections(item)
}

function isOptionSelected(option: string): boolean {
  return selectedOptions.value.includes(option)
}

function optionDisabled(option: string): boolean {
  return transitioning.value
    || (multiple.value && selectedOptions.value.length >= maximum.value && !isOptionSelected(option))
}

function stepStatus(item: OpeningChoiceGroup, index: number): string {
  const count = groupOptions(item).length
  if (isGroupComplete(item)) return item.selectionMode === 'multiple' ? `已录入 ${count} 项` : '已录入'
  if (count) return `${count} / ${minimumSelections(item)} 项`
  return index === activeGroup.value ? '审查中' : '待定'
}

function emberStyle(index: number): Record<string, string> {
  return {
    '--ember-x': `${(index * 47 + 9) % 100}%`,
    '--ember-delay': `${-(index % 7) * .83}s`,
    '--ember-duration': `${5.8 + (index % 5) * .78}s`,
    '--ember-drift': `${((index * 31) % 90) - 45}px`,
    '--ember-size': `${2 + (index % 3)}px`,
  }
}

function animateEntry(): void {
  if (motion.reducedMotion.value) return
  if (!root.value) return
  motion.timeline(undefined, (timeline) => {
    timeline
      .fromTo('.dr-opening__file', { autoAlpha: .28, scaleX: .975, scaleY: .94 }, { autoAlpha: 1, scaleX: 1, scaleY: 1, duration: .5, ease: 'expo.out' }, .04)
      .fromTo('.dr-opening__top', { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: .32, ease: 'power3.out' }, .14)
      .fromTo('.dr-opening__steps button', { autoAlpha: 0, y: -6 }, { autoAlpha: 1, y: 0, duration: .28, stagger: .035, ease: 'power2.out' }, .2)
      .fromTo('.dr-opening__prompt > *, .dr-opening__choices button', { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: .34, stagger: .035, ease: 'power3.out' }, .27)
      .fromTo('.dr-opening__record > *', { autoAlpha: 0, x: 10 }, { autoAlpha: 1, x: 0, duration: .3, stagger: .04, ease: 'power2.out' }, .3)
  })
}

async function goToGroup(nextGroup: number, lockHeld = false): Promise<void> {
  if ((!lockHeld && transitioning.value) || nextGroup === activeGroup.value || nextGroup < 0 || nextGroup >= groups.value.length) return
  const previousGroup = activeGroup.value
  transitioning.value = true
  const token = motion.nextGeneration()
  const node = content.value
  if (node && !motion.reducedMotion.value) {
    motion.timeline(undefined, (timeline) => {
      timeline
        .fromTo('.dr-opening__choices button.selected .dr-opening__stamp', { autoAlpha: 0, scale: 1.55, rotation: -16 }, { autoAlpha: 1, scale: 1, rotation: -7, duration: .2, ease: 'power3.out' }, 0)
        .to(node, { autoAlpha: 0, x: nextGroup > previousGroup ? -28 : 28, clipPath: nextGroup > previousGroup ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)', duration: .2, ease: 'power2.in' }, 0)
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
      timeline
        .fromTo(node, { autoAlpha: 0, x: nextGroup > previousGroup ? 32 : -32, clipPath: nextGroup > previousGroup ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' }, { autoAlpha: 1, x: 0, clipPath: 'inset(0)', duration: .48, ease: 'expo.out' }, 0)
        .fromTo('.dr-opening__choices button', { autoAlpha: 0, x: nextGroup > previousGroup ? 20 : -20 }, { autoAlpha: 1, x: 0, duration: .36, stagger: .045, ease: 'power2.out' }, .09)
    })
  }
  transitioning.value = false
}

async function select(option: string): Promise<void> {
  if (transitioning.value) return
  if (multiple.value) {
    const current = [...selectedOptions.value]
    const next = current.includes(option)
      ? current.filter((item) => item !== option)
      : current.length < maximum.value ? [...current, option] : current
    selected.value = { ...selected.value, [group.value.id]: next }
    return
  }

  selected.value = { ...selected.value, [group.value.id]: [option] }
  if (activeGroup.value < groups.value.length - 1) {
    transitioning.value = true
    await nextTick()
    await goToGroup(activeGroup.value + 1, true)
  } else if (!motion.reducedMotion.value) {
    await nextTick()
    motion.timeline(undefined, (timeline) => {
      timeline.fromTo('.dr-opening__choices button.selected .dr-opening__stamp', { autoAlpha: 0, scale: 1.55, rotation: -16 }, { autoAlpha: 1, scale: 1, rotation: -7, duration: .24, ease: 'power3.out' })
    })
  }
}

async function confirmMultipleGroup(): Promise<void> {
  if (!multiple.value || !isGroupComplete(group.value) || transitioning.value) return
  if (activeGroup.value < groups.value.length - 1) {
    await goToGroup(activeGroup.value + 1)
    return
  }
  await nextTick()
  root.value?.querySelector<HTMLButtonElement>('.dr-opening__record > footer > button')?.focus()
}

function submit(): void {
  if (!complete.value || transitioning.value) return
  const text = selections.value.map((item) => `${item.groupTitle}：${item.option}`).join('；')
  const draft = `我的 Dragon Raja 开局档案：${text}。请根据这份档案开始故事。`
  const token = motion.nextGeneration()
  if (motion.reducedMotion.value) {
    emit('complete', draft)
    return
  }
  transitioning.value = true
  motion.timeline(undefined, (timeline) => {
    timeline
      .to('.dr-opening__review', { xPercent: -7, autoAlpha: .18, clipPath: 'inset(0 100% 0 0)', duration: .48, ease: 'power3.inOut' }, 0)
      .to('.dr-opening__spine', { scaleY: 1.08, filter: 'brightness(1.7)', duration: .3, ease: 'power2.out' }, .05)
      .to('.dr-opening__record', { xPercent: -34, scale: 1.025, boxShadow: '0 32px 90px rgba(185,151,97,.2)', duration: .52, ease: 'expo.inOut' }, .08)
      .to('.dr-opening__archive-flash', { autoAlpha: 1, duration: .24, ease: 'power2.in' }, .3)
  })

  void motion.delay(620, token).then((completed) => {
    if (!completed || !motion.isCurrent(token)) return
    transitioning.value = false
    emit('complete', draft)
  })
}

onMounted(animateEntry)
onBeforeUnmount(() => motion.kill())
</script>

<template>
  <section ref="root" class="dr-opening" role="dialog" aria-modal="true" aria-label="开局档案">
    <div class="dr-opening__atmosphere" aria-hidden="true">
      <i class="dr-opening__ray dr-opening__ray--one" />
      <i class="dr-opening__ray dr-opening__ray--two" />
      <i class="dr-opening__ray dr-opening__ray--three" />
      <span v-for="index in 18" :key="index" class="dr-opening__ember" :style="emberStyle(index)" />
    </div>
    <div class="dr-opening__archive-flash" aria-hidden="true" />

    <header class="dr-opening__top">
      <div class="dr-opening__institution">
        <span class="dr-opening__crest">
          <img v-if="DRAGON_RAJA_MEDIA.cassellCrestUrl" :src="DRAGON_RAJA_MEDIA.cassellCrestUrl" alt="" />
          <b v-else aria-hidden="true">C</b>
        </span>
        <span><strong>卡塞尔学院</strong><small>CASSELL COLLEGE · ADMISSION AUTHORITY</small></span>
      </div>
      <div class="dr-opening__session" aria-hidden="true"><span>SESSION</span><strong>CC-2009 / 01A</strong></div>
      <button type="button" class="dr-opening__skip" aria-label="暂不开局，直接进入故事" :disabled="transitioning" @click="emit('cancel')">
        <span>跳过建档</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
    </header>

    <div class="dr-opening__file">
      <nav class="dr-opening__steps" aria-label="开局步骤" :style="progressStyle">
        <i class="dr-opening__progress" aria-hidden="true" />
        <button
          v-for="(item, index) in groups"
          :key="item.id"
          type="button"
          :class="{ active: index === activeGroup, done: isGroupComplete(item) }"
          :disabled="transitioning"
          :aria-current="index === activeGroup ? 'step' : undefined"
          @click="void goToGroup(index)"
        >
          <span>{{ String(index + 1).padStart(2, '0') }}</span>
          <strong>{{ item.title }}</strong>
          <small>{{ stepStatus(item, index) }}</small>
        </button>
      </nav>

      <main ref="content" class="dr-opening__review">
        <div class="dr-opening__folio" aria-hidden="true">{{ String(activeGroup + 1).padStart(2, '0') }}</div>
        <div class="dr-opening__prompt">
          <div class="dr-opening__counter"><span>{{ String(activeGroup + 1).padStart(2, '0') }}</span><i />{{ String(groups.length).padStart(2, '0') }}<small>ADMISSION REVIEW</small></div>
          <p class="dr-opening__eyebrow">DR / {{ group.id.toUpperCase() }} / CLASSIFIED</p>
          <h1>{{ group.title }}</h1>
          <p class="dr-opening__instruction">{{ group.instruction }}</p>
        </div>
        <div class="dr-opening__choice-panel" :class="{ 'dr-opening__choice-panel--dense': denseChoices }">
          <header class="dr-opening__choice-meta">
            <span>{{ String(group.options.length).padStart(2, '0') }} 项候选</span>
            <strong v-if="multiple">多项判定 · {{ selectedOptions.length }} / {{ maximum }}</strong>
            <strong v-else>单项判定</strong>
          </header>
          <div
            class="dr-opening__choices"
            :class="{
              'dr-opening__choices--dense': denseChoices,
              'dr-opening__choices--extensive': extensiveChoices,
              'dr-opening__choices--multiple': multiple,
            }"
            role="group"
            :aria-label="`${group.title}选项`"
          >
            <button
              v-for="(option, index) in group.options"
              :key="option"
              type="button"
              :class="{ selected: isOptionSelected(option) }"
              :disabled="optionDisabled(option)"
              :aria-pressed="isOptionSelected(option)"
              @click="void select(option)"
            >
              <small>{{ String(index + 1).padStart(2, '0') }}</small>
              <span>{{ option }}</span>
              <i class="dr-opening__choice-line" aria-hidden="true" />
              <b v-if="!multiple" class="dr-opening__stamp" aria-hidden="true">已录入</b>
              <svg v-if="multiple" class="dr-opening__choice-mark" viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="4.5" width="15" height="15" /><path v-if="isOptionSelected(option)" d="m8 12.5 2.7 2.7L16.5 9" /></svg>
              <svg v-else class="dr-opening__choice-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13m-5-5 5 5-5 5" /></svg>
            </button>
          </div>
          <footer v-if="multiple" class="dr-opening__choice-footer">
            <span>{{ selectedOptions.length < minimum ? `至少选择 ${minimum} 项` : `已选择 ${selectedOptions.length} 项` }}</span>
            <button type="button" :disabled="!isGroupComplete(group) || transitioning" @click="void confirmMultipleGroup()">
              {{ activeGroup < groups.length - 1 ? '确认并继续' : '完成本项' }}
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13m-5-5 5 5-5 5" /></svg>
            </button>
          </footer>
        </div>
      </main>

      <i class="dr-opening__spine" aria-hidden="true"><span>DRAGON RAJA · ADMISSION DOSSIER · 2009</span></i>

      <aside class="dr-opening__record">
        <header>
          <span class="dr-opening__record-crest">
            <img v-if="DRAGON_RAJA_MEDIA.cassellCrestUrl" :src="DRAGON_RAJA_MEDIA.cassellCrestUrl" alt="" />
            <b v-else aria-hidden="true">C</b>
          </span>
          <span><small>卡塞尔学院入学登记</small><h2>新生档案</h2><em>ADMISSION RECORD / 01A</em></span>
        </header>
        <div class="dr-opening__record-progress" :style="progressStyle">
          <span><b>{{ completedGroups }}</b> / {{ groups.length }}</span>
          <i><b /></i>
          <small>{{ complete ? '档案完整，等待封存' : '正在写入身份判定' }}</small>
        </div>
        <ol>
          <li v-for="(item, index) in groups" :key="item.id" :class="{ filled: isGroupComplete(item) }">
            <span>{{ String(index + 1).padStart(2, '0') }}</span>
            <p><small>{{ item.title }}</small><strong :title="groupOptions(item).join('、')">{{ groupOptions(item).join('、') || '尚未判定' }}</strong></p>
            <svg v-if="isGroupComplete(item)" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>
            <i v-else aria-hidden="true" />
          </li>
        </ol>
        <footer>
          <p><span>REGISTRAR</span><b>{{ complete ? 'AUTHORIZED' : `${remaining} FIELD${remaining === 1 ? '' : 'S'} PENDING` }}</b></p>
          <button type="button" :disabled="!complete || transitioning" @click="submit">
            <span><small>{{ complete ? '封存档案' : `还需完成 ${remaining} 项` }}</small><strong>{{ complete ? '进入叙事' : '等待审查' }}</strong></span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M8 5h11v11" /></svg>
          </button>
        </footer>
      </aside>
    </div>
  </section>
</template>
