import type { OpeningChoiceGroup } from './types'

export const OPENING_GROUPS: readonly OpeningChoiceGroup[] = [
  {
    id: 'bloodline',
    title: '血统档案',
    instruction: '你的血脉会决定学院如何看待你，也会决定你如何看待自己。',
    options: ['A级混血种候补', '血统评级异常', '普通人伪装者', '失忆的执行专员'],
  },
  {
    id: 'origin',
    title: '抵达方式',
    instruction: '选择你第一次穿过学院结界时，命运留给你的那一道入口。',
    options: ['雨夜列车', '深海打捞船', '芝加哥夜航', '尼伯龙根回声'],
  },
  {
    id: 'discipline',
    title: '行动倾向',
    instruction: '当龙类信号出现时，你最先依赖的是什么？',
    options: ['冷静推演', '危险直觉', '正面压制', '优先守护同伴'],
  },
  {
    id: 'memory',
    title: '封存记忆',
    instruction: '档案里有一页被人为抹除，只留下一个无法解释的画面。',
    options: ['雪夜中的红发女孩', '海底青铜城的钟声', '高架路尽头的黑龙', '一封未寄出的入学通知'],
  },
  {
    id: 'oath',
    title: '入学誓言',
    instruction: '这不是学院的标准誓词，而是你不准备让任何人知道的答案。',
    options: ['找回被夺走的名字', '终结一场未完的战争', '让重要的人活下来', '亲眼确认世界的真相'],
  },
]

export const LOCAL_CODEX_PREVIEW = [
  { label: '卡塞尔学院', kind: '组织', state: '已登记' },
  { label: '执行部', kind: '组织', state: '已登记' },
  { label: '尼伯龙根', kind: '异空间', state: '等待发现' },
  { label: '言灵序列表', kind: '机密档案', state: '等待解锁' },
] as const

export const LOCAL_MAP_PREVIEW = [
  { label: '英灵殿', note: '当前位置', x: 49, y: 46, active: true },
  { label: '诺顿馆', note: '可访问', x: 28, y: 64, active: false },
  { label: '图书馆', note: '可访问', x: 65, y: 30, active: false },
  { label: '冰窖', note: '权限不足', x: 72, y: 72, active: false },
] as const
