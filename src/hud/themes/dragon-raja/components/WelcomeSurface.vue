<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { gsap } from 'gsap'

const emit = defineEmits<{ enter: [] }>()
const archiveYear = new Date().getFullYear()
const leaving = ref(false)
const root = ref<HTMLElement | null>(null)
let departure: gsap.core.Timeline | null = null

function enter(): void {
  if (leaving.value) return
  leaving.value = true
  const node = root.value
  if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    emit('enter')
    return
  }
  departure = gsap.timeline({ onComplete: () => emit('enter') })
    .to('.dr-welcome__seal', { rotate: 18, scale: .84, autoAlpha: 0, duration: .48, ease: 'power3.in' }, 0)
    .to('.dr-welcome__copy > *', { y: -24, autoAlpha: 0, duration: .38, stagger: .035, ease: 'power2.in' }, .08)
    .to(node, { clipPath: 'inset(49% 0 49% 0)', filter: 'brightness(2)', duration: .52, ease: 'power4.inOut' }, .24)
}

onBeforeUnmount(() => departure?.kill())
</script>

<template>
  <section ref="root" class="dr-welcome">
    <div class="dr-welcome__weather" aria-hidden="true"><span /><span /><span /></div>
    <div class="dr-welcome__coordinates" aria-hidden="true">41°50′N · 87°37′W<br>ACADEMY NETWORK / ENCRYPTED</div>
    <div class="dr-welcome__seal" aria-hidden="true"><svg viewBox="0 0 240 240"><circle cx="120" cy="120" r="102"/><circle cx="120" cy="120" r="79"/><path d="M120 32 139 96l68 24-68 24-19 64-19-64-68-24 68-24Z"/><path d="m83 72 37 48 37-48M83 168l37-48 37 48"/></svg></div>
    <div class="dr-welcome__copy">
      <p>一封只会出现一次的录取通知</p>
      <h1>Dragon Raja</h1>
      <blockquote>“欢迎来到卡塞尔学院。<br>从这一刻起，世界会向你显露它真正的名字。”</blockquote>
      <button type="button" :disabled="leaving" @click="enter"><span>{{ leaving ? '身份验证中' : '拆开信封' }}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 6l6 6-6 6" /></svg></button>
    </div>
    <footer><span>CC1000 次快车等待发车</span><span>档案编号：DR–{{ archiveYear }}</span></footer>
  </section>
</template>
