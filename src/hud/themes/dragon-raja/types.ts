export type DragonRajaSurface = 'welcome' | 'opening' | 'story' | 'settings'
export type DragonRajaOverlay = 'codex' | 'map' | 'menu' | 'rollback' | 'exit' | null

export interface OpeningChoiceGroup {
  id: string
  title: string
  instruction: string
  options: readonly string[]
}

export interface OpeningSelection {
  groupId: string
  groupTitle: string
  option: string
}

export interface DerivedStatus {
  key: string
  value: string
}
