import type { SubtitleMapping, VttCue } from '../../types/subtitle'

export type SubtitleState = {
  visible: boolean
  mappings: SubtitleMapping[]
  activeMappingId: number | null
  cues: VttCue[]
  subtitleMissing: boolean
  loading: boolean
  autoScroll: boolean
  fontSizeDesktop: number
  fontSizeMobile: number
  seekBeforeJump: number | null
  panelPos: { x: number; y: number }
  panelSize: { width: number; height: number }
}

const STORAGE_KEY = 'subtitle-prefs'

function loadPrefs(): Partial<SubtitleState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

export default function (): SubtitleState {
  const prefs = loadPrefs()
  return {
    visible: false,
    mappings: [],
    activeMappingId: null,
    cues: [],
    subtitleMissing: false,
    loading: false,
    autoScroll: prefs.autoScroll ?? true,
    fontSizeDesktop: prefs.fontSizeDesktop ?? 14,
    fontSizeMobile: prefs.fontSizeMobile ?? 14,
    seekBeforeJump: null,
    panelPos: prefs.panelPos ?? { x: 0, y: 0 },
    panelSize: prefs.panelSize ?? { width: 380, height: 300 },
  }
}