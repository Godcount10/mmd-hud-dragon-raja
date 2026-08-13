import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import type { ChatSnapshot } from '../../src/contracts'
import { parseDerivedMarkers } from '../../src/hud/themes/dragon-raja/parseDerivedMarkers'
import { sanitizeMessageHtml } from '../../src/hud/themes/dragon-raja/sanitizeMessageHtml'
import { useDerivedDossier } from '../../src/hud/themes/dragon-raja/useDerivedStatus'
import { createTestSnapshot } from '../helpers/snapshot'

function message(text: string, role: ChatSnapshot['messages'][number]['role'] = 'assistant', index = 0): ChatSnapshot['messages'][number] {
  return {
    id: `message-${index}`,
    role,
    index,
    text,
    html: text,
    streaming: false,
    capabilities: {
      copy: false, edit: false, delete: false, regenerate: false,
      rollback: false, startNewStory: false, previousBranch: false, nextBranch: false,
    },
  }
}

describe('Dragon Raja dossier parsing', () => {
  it('reads scene, characters, options and forum from reserved keys', () => {
    const dossier = parseDerivedMarkers(
      '[时间=21:30]'
      + '[角色1姓名=楚子航][角色1身份=狮心会会长][角色1关系=执行专员][角色1血统=A级 / 高危躁动]'
      + '[角色1言灵=序列89·君焰][角色1装备=妖刀·村雨][角色1特质=奥丁印记]'
      + '[角色1描述=永远面瘫的师兄][角色1台词=立刻回学院][角色1我方台词=师兄真死板][角色1侧写=黄金瞳]'
      + '[角色2姓名=夏弥][角色2身份=卡塞尔学院新生]'
      + '[选项1标题=开启黄金瞳威慑][选项1=你直接点燃了黄金瞳]'
      + '[头条1=十万初始积分？][帖子作者=@爆料达人][帖子正文=震惊][回复1昵称=吃瓜群众][回复1=真的假的？]',
    )

    expect(dossier.time).toBe('21:30')
    expect(dossier.characters).toHaveLength(2)
    expect(dossier.characters[0]).toMatchObject({
      slot: 1, name: '楚子航', title: '狮心会会长', relation: '执行专员',
      blood: 'A级 / 高危躁动', spirit: '序列89·君焰', equipment: '妖刀·村雨',
      trait: '奥丁印记', description: '永远面瘫的师兄',
      characterLine: '立刻回学院', playerLine: '师兄真死板', profile: '黄金瞳',
    })
    expect(dossier.characters[1]?.name).toBe('夏弥')
    expect(dossier.options).toEqual([{ slot: 1, label: '开启黄金瞳威慑', text: '你直接点燃了黄金瞳' }])
    expect(dossier.forum).toMatchObject({
      headlines: ['十万初始积分？'], threadAuthor: '@爆料达人', threadBody: '震惊',
      replies: [{ slot: 1, handle: '吃瓜群众', text: '真的假的？' }],
    })
  })

  it('keeps unreserved keys as free-form statuses and drops nameless character slots', () => {
    const dossier = parseDerivedMarkers('[好感度=18][地点=英灵殿][角色1身份=无名者][选项2=只有正文]')

    expect(dossier.statuses).toEqual([{ key: '好感度', value: '18' }, { key: '地点', value: '英灵殿' }])
    expect(dossier.characters).toEqual([])
    // Label falls back to the injected text when only `[选项N=…]` is supplied.
    expect(dossier.options).toEqual([{ slot: 2, label: '只有正文', text: '只有正文' }])
  })

  it('ignores slots past the supported range', () => {
    const dossier = parseDerivedMarkers('[角色7姓名=第七人][选项4=第四项][头条4=第四条][回复4=第四条回复]')

    expect(dossier.characters).toEqual([])
    expect(dossier.options).toEqual([])
    expect(dossier.forum).toBeNull()
  })
})

describe('Dragon Raja dossier snapshot semantics', () => {
  it('lets the latest marker-bearing assistant message define the whole panel', () => {
    const snapshot = createTestSnapshot()
    snapshot.messages = [
      message('[角色1姓名=楚子航][角色1身份=狮心会会长][地点=英灵殿]', 'assistant', 0),
      message('[角色1姓名=用户不该被读到]', 'user', 1),
      message('[角色1姓名=夏弥][好感度=18]', 'assistant', 2),
    ]

    const dossier = useDerivedDossier(ref(snapshot))

    // Whole-snapshot: nothing from message 0 survives, so no half-Chuzihang half-Xiami composite.
    expect(dossier.value.characters).toHaveLength(1)
    expect(dossier.value.characters[0]?.name).toBe('夏弥')
    expect(dossier.value.characters[0]?.title).toBe('')
    expect(dossier.value.statuses).toEqual([{ key: '好感度', value: '18' }])
  })

  it('reports no content when only user messages carry markers', () => {
    const snapshot = createTestSnapshot()
    snapshot.messages = [message('[角色1姓名=楚子航]', 'user', 0)]

    expect(useDerivedDossier(ref(snapshot)).value.hasContent).toBe(false)
  })
})

describe('Dragon Raja marker stripping', () => {
  it('removes markers from assistant prose and collapses emptied containers', () => {
    const output = sanitizeMessageHtml('<p>[角色1姓名=楚子航][时间=21:30]</p><p>他站在天台上。</p>', true)

    expect(output).not.toContain('[')
    expect(output).not.toContain('角色1姓名')
    expect(output).toBe('<p>他站在天台上。</p>')
  })

  it('keeps prose that surrounds a marker, and leaves user text untouched', () => {
    expect(sanitizeMessageHtml('<p>夜色沉了。[时间=21:30]他转过身。</p>', true)).toBe('<p>夜色沉了。他转过身。</p>')
    // Without the flag a reader's own brackets survive verbatim.
    expect(sanitizeMessageHtml('<p>我写了[一个笔记=测试]。</p>')).toBe('<p>我写了[一个笔记=测试]。</p>')
  })

  it('does not disturb brackets that live inside attributes', () => {
    const output = sanitizeMessageHtml('<p><span style="color: rgb(255, 0, 0)">红色[标记=值]文字</span></p>', true)

    expect(output).toContain('红色文字')
    expect(output).toContain('color')
  })
})
