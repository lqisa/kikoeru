import type { SubtitleState } from './state'
import type { SubtitleMapping, VttCue } from '../../types/subtitle'
import { parseVtt, parseLrc } from '../../utils/vttParser'
import axios from 'axios'

const actions = {
  TOGGLE_VISIBLE(this: SubtitleState) {
    this.visible = !this.visible
  },

  SET_VISIBLE(this: SubtitleState, val: boolean) {
    this.visible = val
  },

  SET_MAPPINGS(this: SubtitleState, mappings: SubtitleMapping[]) {
    this.mappings = mappings
  },

  SET_ACTIVE_MAPPING(this: SubtitleState, id: number | null) {
    this.activeMappingId = id
  },

  SET_CUES(this: SubtitleState, cues: VttCue[]) {
    this.cues = cues
  },

  SET_SUBTITLE_MISSING(this: SubtitleState, val: boolean) {
    this.subtitleMissing = val
  },

  SET_LOADING(this: SubtitleState, val: boolean) {
    this.loading = val
  },

  async LOAD_SUBTITLE(this: SubtitleState, mappingId: number) {
    this.loading = true
    try {
      const res = await axios.get(`/api/subtitle/file/${mappingId}`, {
        responseType: 'text',
      })
      const content: string = res.data
      const mapping = this.mappings.find((m) => m.id === mappingId)
      if (!mapping) return

      let cues: VttCue[]
      if (mapping.subtitleType === 'vtt') {
        cues = parseVtt(content)
      } else {
        cues = parseLrc(content)
      }

      this.cues = cues
      this.activeMappingId = mappingId
    } catch (err) {
      console.error('Failed to load subtitle:', err)
      this.cues = []
    } finally {
      this.loading = false
    }
  },

  async FETCH_MAPPINGS(
    this: SubtitleState,
    payload: { workId: string; audioFilename: string },
  ) {
    this.loading = true
    try {
      const res = await axios.get('/api/subtitle/mapping', {
        params: {
          workId: payload.workId,
          audioFilename: payload.audioFilename,
        },
      })
      const mappings: SubtitleMapping[] = res.data.mappings || []
      const subtitleMissing: boolean = res.data.subtitleMissing || false

      this.mappings = mappings
      this.subtitleMissing = subtitleMissing

      if (mappings.length > 0) {
        const lrcMapping = mappings.find(
          (m: SubtitleMapping) => m.subtitleType === 'lrc',
        )
        const target = lrcMapping ?? mappings[0]
        if (target) {
          const subRes = await axios.get(`/api/subtitle/file/${target.id}`, {
            responseType: 'text',
          })
          const content: string = subRes.data
          let cues: VttCue[]
          if (target.subtitleType === 'vtt') {
            cues = parseVtt(content)
          } else {
            cues = parseLrc(content)
          }
          this.cues = cues
          this.activeMappingId = target.id
        }
      } else {
        this.cues = []
        this.activeMappingId = null
      }
    } catch (err) {
      console.error('Failed to fetch subtitle mappings:', err)
      this.mappings = []
      this.cues = []
      this.subtitleMissing = true
    } finally {
      this.loading = false
    }
  },

  RESET(this: SubtitleState) {
    this.mappings = []
    this.activeMappingId = null
    this.cues = []
    this.subtitleMissing = false
    this.loading = false
  },
}

export default actions