import DragonRajaHud from './DragonRajaHud.vue'
import styles from './dragon-raja.css?inline'
import type { HudThemeDefinition } from '../types'

export const dragonRajaTheme: HudThemeDefinition = {
  id: 'dragon-raja',
  name: 'Dragon Raja',
  component: DragonRajaHud,
  styles,
}
