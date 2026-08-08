import { computed, type Ref } from 'vue'
import type { ChatSnapshot } from '../../../contracts'
import type { DerivedStatus } from './types'

const STATUS_PATTERN = /\[([^\]=]+)=([^\]]*)\]/g

export function useDerivedStatus(snapshot: Readonly<Ref<ChatSnapshot>>) {
  return computed<DerivedStatus[]>(() => {
    const latest = new Map<string, string>()
    for (const message of snapshot.value.messages) {
      if (message.role !== 'assistant') continue
      STATUS_PATTERN.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = STATUS_PATTERN.exec(message.text)) !== null) {
        const key = match[1]?.trim()
        const value = match[2]?.trim()
        if (key && value) latest.set(key, value)
      }
    }
    return [...latest].map(([key, value]) => ({ key, value })).slice(-6)
  })
}
