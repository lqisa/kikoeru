import type { SubtitleMapping, VttCue } from '../../types/subtitle'

export type SubtitleState = {
  visible: boolean
  mappings: SubtitleMapping[]
  activeMappingId: number | null
  cues: VttCue[]
  subtitleMissing: boolean
  loading: boolean
}

export default function (): SubtitleState {
  return {
    visible: false,
    mappings: [],
    activeMappingId: null,
    cues: [],
    subtitleMissing: false,
    loading: false,
  }
}