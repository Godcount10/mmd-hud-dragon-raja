import { ref } from 'vue'
import type { ChatSnapshot } from '../../src/contracts'
import { useDerivedStatus } from '../../src/hud/themes/dragon-raja/useDerivedStatus'
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
      copy: false,
      edit: false,
      delete: false,
      regenerate: false,
      rollback: false,
      startNewStory: false,
      previousBranch: false,
      nextBranch: false,
    },
  }
}

describe('Dragon Raja derived status', () => {
  /*
   * Whole-snapshot semantics: the newest marker-bearing assistant message defines the panel and
   * earlier ones are ignored outright. Merging was dropped because a repeated slot could otherwise
   * compose one character out of two different people.
   */
  it('reads only assistant markers, and only from the latest message that carries any', () => {
    const snapshot = createTestSnapshot()
    snapshot.messages = [
      message('[地点=英灵殿][好感度=12]', 'assistant', 0),
      message('[地点=诺顿馆][任务=调查钟声]', 'user', 1),
      message('[好感度=18][状态=警戒]', 'assistant', 2),
    ]
    const statuses = useDerivedStatus(ref(snapshot))
    expect(statuses.value).toEqual([
      { key: '好感度', value: '18' },
      { key: '状态', value: '警戒' },
    ])
  })

  it('returns only the last six markers of the defining message', () => {
    const snapshot = createTestSnapshot()
    snapshot.messages = [message([0, 1, 2, 3, 4, 5, 6].map((index) => `[K${index}=V${index}]`).join(''), 'assistant', 0)]
    expect(useDerivedStatus(ref(snapshot)).value).toHaveLength(6)
    expect(useDerivedStatus(ref(snapshot)).value[0]).toEqual({ key: 'K1', value: 'V1' })
  })
})
